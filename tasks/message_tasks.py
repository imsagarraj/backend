from celery_app import celery_app
from database.supabase_client import get_supabase
from services.message_pipeline import enqueue, process_batch, retry_failed
from services.scheduler_service import (
    get_customers_with_appointment_today,
    get_customers_with_past_appointment,
)
from services.followup_service import get_due_followups
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)


@celery_app.task
def enqueue_daily_sequences():
    supabase = get_supabase()

    due_followups = get_due_followups()
    seq_count = 0
    for customer, touch_number, sequence_id in due_followups:
        try:
            biz_id = customer.get('business_id')
            if not biz_id:
                continue
            biz = supabase.table('business_profiles').select('*').eq('id', biz_id).execute()
            if not biz.data:
                continue
            optimal_time = _get_optimal_time(customer)
            enqueue(customer, biz.data[0], 'sequence', touch_number, optimal_time, followup_sequence_id=sequence_id)
            seq_count += 1
        except Exception as e:
            logger.error(f"Failed to enqueue customer {customer.get('id')}: {e}")

    reminders = get_customers_with_appointment_today()
    rem_count = 0
    for customer, _ in reminders:
        try:
            biz_id = customer.get('business_id')
            if not biz_id:
                continue
            biz = supabase.table('business_profiles').select('*').eq('id', biz_id).execute()
            if not biz.data:
                continue
            optimal_time = _get_optimal_time(customer)
            enqueue(customer, biz.data[0], 'appointment_reminder', scheduled_at=optimal_time)
            rem_count += 1
        except Exception as e:
            logger.error(f"Failed to enqueue reminder for {customer.get('id')}: {e}")

    followups = get_customers_with_past_appointment()
    fup_count = 0
    for customer, _ in followups:
        try:
            biz_id = customer.get('business_id')
            if not biz_id:
                continue
            biz = supabase.table('business_profiles').select('*').eq('id', biz_id).execute()
            if not biz.data:
                continue
            optimal_time = _get_optimal_time(customer)
            enqueue(customer, biz.data[0], 'appointment_followup', scheduled_at=optimal_time)
            fup_count += 1
        except Exception as e:
            logger.error(f"Failed to enqueue followup for {customer.get('id')}: {e}")

    logger.info(f"Enqueued {seq_count} sequences, {rem_count} reminders, {fup_count} followups")
    return {'sequences': seq_count, 'reminders': rem_count, 'followups': fup_count}


@celery_app.task
def process_pipeline_batch():
    processed = process_batch(batch_size=20)
    logger.info(f"Pipeline batch processed {processed} items")
    return {'processed': processed}


@celery_app.task
def retry_failed_pipeline():
    result = retry_failed()
    logger.info(f"Pipeline retry: {result['retried']} retried, {result['dead']} dead")
    return result


@celery_app.task
def process_smart_timing():
    supabase = get_supabase()
    try:
        customers = supabase.table('customers').select('*').gte(
            'response_count', 3
        ).eq('status', 'active').execute()

        for customer in customers.data:
            msgs = supabase.table('messages').select('timestamp').eq(
                'customer_id', customer['id']
            ).eq('direction', 'received').order('timestamp').execute()

            if len(msgs.data) >= 3:
                hours = []
                for m in msgs.data:
                    if m.get('timestamp'):
                        ts = m['timestamp']
                        if isinstance(ts, str):
                            ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                        hours.append(ts.hour)
                if hours:
                    avg_hour = round(sum(hours) / len(hours))
                    supabase.table('customers').update({
                        'best_contact_time': f"{avg_hour:02d}:00"
                    }).eq('id', customer['id']).execute()

        logger.info(f"Smart timing updated for {len(customers.data)} customers")
    except Exception as e:
        logger.error(f"Smart timing error: {e}")


def _get_optimal_time(customer):
    now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    bct = customer.get('best_contact_time')
    if bct:
        try:
            hour, minute = bct.split(':')
            return (today.replace(hour=int(hour), minute=int(minute)) - timedelta(hours=5, minutes=30)).isoformat()
        except (ValueError, TypeError):
            pass

    return (today.replace(hour=10, minute=0) - timedelta(hours=5, minutes=30)).isoformat()
