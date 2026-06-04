from celery_app import celery_app
from database.supabase_client import get_supabase
from services.message_pipeline import enqueue, process_batch, retry_failed
from services.scheduler_service import (
    get_customers_due_today,
    get_customers_due_for_weekend,
    get_customers_for_upcoming_festival,
    get_customers_with_appointment_today,
    get_customers_with_past_appointment,
    get_customers_available_at_time,
)
from services.festival_utils import is_friday, is_weekend_approach
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)


@celery_app.task
def enqueue_daily_sequences():
    supabase = get_supabase()

    due_customers = get_customers_due_today()
    seq_count = 0
    for customer, sequence_day in due_customers:
        try:
            biz_id = customer.get('business_id')
            if not biz_id:
                continue
            biz = supabase.table('business_profiles').select('*').eq('id', biz_id).execute()
            if not biz.data:
                continue
            optimal_time = _get_optimal_time(customer)
            enqueue(customer, biz.data[0], 'sequence', sequence_day, optimal_time)
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
def enqueue_weekend_messages():
    if not is_friday():
        return {'status': 'skipped', 'reason': 'Not Friday'}
    supabase = get_supabase()

    weekend_customers = get_customers_due_for_weekend()
    count = 0
    for customer in weekend_customers:
        try:
            biz_id = customer.get('business_id')
            if not biz_id:
                continue
            biz = supabase.table('business_profiles').select('*').eq('id', biz_id).execute()
            if not biz.data:
                continue
            optimal_time = _get_optimal_time(customer)
            enqueue(customer, biz.data[0], 'weekend_plan', scheduled_at=optimal_time)
            count += 1
        except Exception as e:
            logger.error(f"Failed to enqueue weekend msg for {customer.get('id')}: {e}")

    logger.info(f"Enqueued {count} weekend messages")
    return {'weekend_messages': count}


@celery_app.task
def enqueue_festival_messages():
    supabase = get_supabase()

    festival_customers = get_customers_for_upcoming_festival()
    count = 0
    for customer, context in festival_customers:
        try:
            biz_id = customer.get('business_id')
            if not biz_id:
                continue
            biz = supabase.table('business_profiles').select('*').eq('id', biz_id).execute()
            if not biz.data:
                continue
            optimal_time = _get_optimal_time(customer)
            enqueue(customer, biz.data[0], 'festival_greeting', scheduled_at=optimal_time,
                    payload_extra={'festival': context['primary']['name'],
                                   'festival_date': str(context['primary']['date'])})
            count += 1
        except Exception as e:
            logger.error(f"Failed to enqueue festival msg for {customer.get('id')}: {e}")

    logger.info(f"Enqueued {count} festival messages")
    return {'festival_messages': count}


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


@celery_app.task
def process_read_receipts():
    supabase = get_supabase()
    try:
        read_msgs = supabase.table('messages').select(
            'customer_id, timestamp'
        ).eq('status', 'read').execute()

        customer_hours = {}
        for m in read_msgs.data:
            cid = m['customer_id']
            ts = m.get('timestamp')
            if ts:
                if isinstance(ts, str):
                    ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                hour = ts.hour
                if cid not in customer_hours:
                    customer_hours[cid] = []
                customer_hours[cid].append(hour)

        for cid, hours in customer_hours.items():
            if len(hours) >= 2:
                avg_hour = round(sum(hours) / len(hours))
                supabase.table('customers').update({
                    'best_contact_time': f"{avg_hour:02d}:00"
                }).eq('id', cid).execute()

        logger.info(f"Read receipt analysis: {len(customer_hours)} customers")
    except Exception as e:
        logger.error(f"Read receipt error: {e}")


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
