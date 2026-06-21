import random
from datetime import date, datetime, timedelta, timezone
from database.supabase_client import get_supabase
import logging

logger = logging.getLogger(__name__)

TOUCH_COUNT = 5


def generate_followup_sequence(customer, business, agent):
    supabase = get_supabase()
    purchase_date = customer.get('purchase_date')
    if not purchase_date:
        return []

    if isinstance(purchase_date, str):
        pd = date.fromisoformat(purchase_date)
    else:
        pd = purchase_date

    existing = supabase.table('follow_up_sequences').select('id').eq(
        'customer_id', customer['id']
    ).execute()
    if existing.data:
        return existing.data

    today = date.today()
    start_offset = 2
    end_offset = 30
    available_days = list(range(start_offset, end_offset + 1))

    if len(available_days) < TOUCH_COUNT:
        chosen = available_days
    else:
        chosen = sorted(random.sample(available_days, TOUCH_COUNT))

    rows = []
    for i, day_offset in enumerate(chosen):
        sched_date = pd + timedelta(days=day_offset)
        if sched_date < today:
            continue
        rows.append({
            'customer_id': customer['id'],
            'business_id': business['id'],
            'touch_number': i + 1,
            'scheduled_date': sched_date.isoformat(),
            'status': 'pending',
        })

    if rows:
        result = supabase.table('follow_up_sequences').insert(rows).execute()
        return result.data

    return []


def get_due_followups(scheduled_date=None):
    supabase = get_supabase()
    if scheduled_date is None:
        scheduled_date = date.today()
    elif isinstance(scheduled_date, datetime):
        scheduled_date = scheduled_date.date()

    result = supabase.table('follow_up_sequences').select(
        '*, customers!inner(*)'
    ).eq('status', 'pending').eq('scheduled_date', scheduled_date.isoformat()).execute()

    due = []
    for row in result.data:
        customer = row.get('customers')
        if customer and customer.get('status') == 'active':
            due.append((customer, row.get('touch_number'), row.get('id')))
    return due


def complete_followup(sequence_id):
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    supabase.table('follow_up_sequences').update({
        'status': 'completed',
        'completed_at': now,
    }).eq('id', sequence_id).execute()

    row = supabase.table('follow_up_sequences').select('customer_id, touch_number').eq('id', sequence_id).execute()
    if row.data:
        customer_id = row.data[0]['customer_id']
        touch = row.data[0]['touch_number']
        remaining = supabase.table('follow_up_sequences').select('id').eq(
            'customer_id', customer_id
        ).eq('status', 'pending').execute()
        if not remaining.data:
            supabase.table('customers').update({
                'status': 'completed',
                'current_sequence_day': 30,
            }).eq('id', customer_id).execute()
        else:
            supabase.table('customers').update({
                'current_sequence_day': touch,
            }).eq('id', customer_id).execute()
