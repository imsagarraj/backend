"""
Message Pipeline State Machine
Stages: pending_schedule -> pending_ai_gen -> ready_to_send -> sending -> sent
                                                                   -> failed -> dead
"""

from database.supabase_client import get_supabase
from services.whatsapp_service import send_text_message
from services.gemini_service import generate_followup_message, generate_appointment_message
from database.seed import get_active_agent
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

STAGES = [
    'pending_schedule',
    'pending_ai_gen',
    'ready_to_send',
    'sending',
    'sent',
    'failed',
    'dead',
]


def enqueue(customer, business, message_type, sequence_day=None, scheduled_at=None):
    supabase = get_supabase()
    if scheduled_at is None:
        scheduled_at = datetime.now(timezone.utc).isoformat()
    elif isinstance(scheduled_at, datetime):
        scheduled_at = scheduled_at.isoformat()

    row = {
        'customer_id': customer['id'],
        'business_id': business['id'],
        'message_type': message_type,
        'stage': 'pending_schedule',
        'sequence_day': sequence_day,
        'scheduled_at': scheduled_at,
        'payload': {
            'customer_name': customer.get('name'),
            'customer_phone': customer.get('phone'),
            'product': customer.get('product') or customer.get('product_purchased', ''),
            'purchase_date': str(customer.get('purchase_date', '')),
        },
    }
    result = supabase.table('message_queue').insert(row).execute()
    return result.data[0] if result.data else None


def advance(queue_id, next_stage, updates=None):
    supabase = get_supabase()
    payload = {
        'stage': next_stage,
        'updated_at': datetime.now(timezone.utc).isoformat(),
        **(updates or {}),
    }
    supabase.table('message_queue').update(payload).eq('id', queue_id).execute()


def process_batch(batch_size=20):
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    processed = 0

    # 1. Process items ready to send (have AI-generated text)
    ready_items = supabase.table('message_queue').select('*').eq(
        'stage', 'ready_to_send'
    ).lte('scheduled_at', now).limit(batch_size).execute()

    for item in ready_items.data:
        try:
            advance(item['id'], 'sending')
            phone = item['payload'].get('customer_phone', '')
            text = item.get('ai_generated_text', '')

            pn_id = None
            if item.get('business_id'):
                bp = supabase.table('business_profiles').select('meta_phone_number_id').eq('id', item['business_id']).execute()
                if bp.data and bp.data[0].get('meta_phone_number_id'):
                    pn_id = bp.data[0]['meta_phone_number_id']

            result = send_text_message(phone, text, phone_number_id=pn_id)
            if result.get('status') == 'success':
                advance(item['id'], 'sent', {
                    'meta_message_id': result.get('message_id', ''),
                    'sent_at': datetime.now(timezone.utc).isoformat(),
                })
                _update_customer_after_send(item)
            else:
                _handle_failure(item, result.get('error', 'WhatsApp send failed'))
        except Exception as e:
            _handle_failure(item, str(e))
        processed += 1

    # 2. Process items needing AI generation
    ai_items = supabase.table('message_queue').select('*').eq(
        'stage', 'pending_ai_gen'
    ).limit(batch_size).execute()

    for item in ai_items.data:
        try:
            customer_data = supabase.table('customers').select('*').eq('id', item['customer_id']).execute()
            biz_data = supabase.table('business_profiles').select('*').eq('id', item['business_id']).execute()
            agent = get_active_agent(item['business_id'])

            if not customer_data.data or not biz_data.data or not agent:
                _handle_failure(item, 'Missing customer/business/agent')
                continue

            customer = customer_data.data[0]
            business = biz_data.data[0]

            if item['message_type'] == 'sequence':
                text = generate_followup_message(customer, business, agent, item['sequence_day'])
            elif item['message_type'] in ('appointment_reminder', 'appointment_followup'):
                sub_type = 'reminder' if item['message_type'] == 'appointment_reminder' else 'followup'
                text = generate_appointment_message(customer, business, agent, sub_type)
            else:
                _handle_failure(item, f'Unknown message_type: {item["message_type"]}')
                continue

            advance(item['id'], 'ready_to_send', {'ai_generated_text': text})
        except Exception as e:
            _handle_failure(item, str(e))
        processed += 1

    return processed


def retry_failed():
    supabase = get_supabase()
    failed = supabase.table('message_queue').select('*').eq('stage', 'failed').execute()

    retried = 0
    dead = 0
    for item in failed.data:
        new_count = (item.get('retry_count') or 0) + 1
        if new_count >= item.get('max_retries', 3):
            advance(item['id'], 'dead', {'retry_count': new_count})
            dead += 1
        else:
            advance(item['id'], 'pending_ai_gen', {
                'retry_count': new_count,
                'error_log': None,
            })
            retried += 1

    return {'retried': retried, 'dead': dead}


def get_status(business_id=None):
    supabase = get_supabase()
    query = supabase.table('message_queue').select('stage', count='exact')

    if business_id:
        query = query.eq('business_id', business_id)

    all_items = query.execute()
    counts = {s: 0 for s in STAGES}
    for item in all_items.data:
        counts[item['stage']] = counts.get(item['stage'], 0) + 1

    failed_query = supabase.table('message_queue').select(
        'id, customer_id, business_id, message_type, error_log, retry_count, created_at, updated_at'
    ).eq('stage', 'failed').order('updated_at', desc=True).limit(20)

    if business_id:
        failed_query = failed_query.eq('business_id', business_id)

    failed_items = failed_query.execute()

    items_query = supabase.table('message_queue').select(
        'id, customer_id, business_id, message_type, stage, sequence_day, error_log, retry_count, max_retries, scheduled_at, created_at, updated_at'
    ).order('created_at', desc=True).limit(200)

    if business_id:
        items_query = items_query.eq('business_id', business_id)

    items_data = items_query.execute()
    items = []
    for item in items_data.data:
        customer_name = None
        customer_phone = None
        if item.get('customer_id'):
            c = supabase.table('customers').select('name, phone').eq('id', item['customer_id']).execute()
            if c.data:
                customer_name = c.data[0].get('name')
                customer_phone = c.data[0].get('phone')
        business_name = None
        if item.get('business_id'):
            b = supabase.table('business_profiles').select('business_name').eq('id', item['business_id']).execute()
            if b.data:
                business_name = b.data[0].get('business_name')
        items.append({
            **item,
            'customer_name': customer_name,
            'customer_phone': customer_phone,
            'business_name': business_name,
        })

    return {
        'counts': counts,
        'total': sum(counts.values()),
        'recent_failures': failed_items.data,
        'items': items,
    }


def get_business_pipeline(business_id, limit=50):
    supabase = get_supabase()
    items = supabase.table('message_queue').select(
        'id, customer_id, message_type, stage, sequence_day, error_log, retry_count, scheduled_at, created_at, updated_at'
    ).eq('business_id', business_id).order('created_at', desc=True).limit(limit).execute()
    return items.data


def _update_customer_after_send(item):
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    if item['message_type'] == 'sequence':
        from services.scheduler_service import get_next_sequence_day
        next_day = get_next_sequence_day(item['sequence_day'])
        updates = {'last_contact': now}
        if next_day == 'completed':
            updates['current_sequence_day'] = 30
            updates['status'] = 'completed'
        else:
            updates['current_sequence_day'] = next_day
        supabase.table('customers').update(updates).eq('id', item['customer_id']).execute()
    else:
        supabase.table('customers').update({'last_contact': now}).eq(
            'id', item['customer_id']
        ).execute()


def _handle_failure(item, error_msg):
    logger.error(f"Pipeline failure: queue_id={item['id']}, error={error_msg}")
    advance(item['id'], 'failed', {'error_log': error_msg})
