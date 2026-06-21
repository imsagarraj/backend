from celery_app import celery_app
from database.supabase_client import get_supabase
from services.message_pipeline import enqueue, process_batch, retry_failed
from services.scheduler_service import (
    get_customers_with_appointment_today,
    get_customers_with_past_appointment,
)
from services.followup_service import get_due_followups
from datetime import datetime, timedelta, timezone
from collections import Counter
import random
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
        now_ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
        week_ago = (now_ist - timedelta(days=7)).isoformat()

        customers = supabase.table('customers').select('*').gte(
            'response_count', 3
        ).eq('status', 'active').execute()

        updated = 0
        for customer in customers.data:
            msgs = supabase.table('messages').select('timestamp').eq(
                'customer_id', customer['id']
            ).eq('direction', 'received').execute()

            if len(msgs.data) < 3:
                continue

            recent = []
            older = []
            for m in msgs.data:
                if m.get('timestamp'):
                    ts = m['timestamp']
                    if isinstance(ts, str):
                        ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    ts_ist = ts + timedelta(hours=5, minutes=30)
                    hour = ts_ist.hour
                    if ts.isoformat() >= week_ago:
                        recent.append(hour)
                    else:
                        older.append(hour)

            all_hours = recent + older
            if not all_hours:
                continue

            if recent:
                weights = [3] * len(recent) + [1] * len(older)
                weighted = []
                for h, w in zip(all_hours, weights):
                    weighted.extend([h] * w)
                best_hour = Counter(weighted).most_common(1)[0][0]
            else:
                best_hour = Counter(all_hours).most_common(1)[0][0]

            supabase.table('customers').update({
                'best_contact_time': f"{best_hour:02d}:00"
            }).eq('id', customer['id']).execute()
            updated += 1

        logger.info(f"Smart timing updated for {updated} customers")
    except Exception as e:
        logger.error(f"Smart timing error: {e}")


def _get_optimal_time(customer):
    now_ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    today_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)

    bct = customer.get('best_contact_time')
    if bct:
        try:
            hour, _ = bct.split(':')
            minute = random.randint(0, 59)
            return (today_ist.replace(hour=int(hour), minute=minute) - timedelta(hours=5, minutes=30)).isoformat()
        except (ValueError, TypeError):
            pass

    minute = random.randint(0, 59)
    return (today_ist.replace(hour=10, minute=minute) - timedelta(hours=5, minutes=30)).isoformat()
