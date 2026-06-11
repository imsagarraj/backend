from datetime import date, datetime, timedelta, timezone
from database.supabase_client import get_supabase


def get_customers_due_today():
    supabase = get_supabase()
    today = date.today()

    customers = supabase.table('customers').select('*').eq('status', 'active').execute()
    due = []

    for c in customers.data:
        purchase_date_str = c.get('purchase_date')
        if not purchase_date_str:
            continue
        if isinstance(purchase_date_str, str):
            pd = date.fromisoformat(purchase_date_str)
        else:
            pd = purchase_date_str

        days_since = (today - pd).days
        current_seq = c.get('current_sequence_day', 0)

        for trigger_day, next_seq in [(1, 0), (3, 1), (15, 3), (30, 15)]:
            if days_since == trigger_day and current_seq == next_seq:
                due.append((c, trigger_day))
                break

    return due


def get_customers_with_appointment_today():
    supabase = get_supabase()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    customers = supabase.table('customers').select('*').gte(
        'next_booking', today_start.isoformat()
    ).lt('next_booking', today_end.isoformat()).execute()

    return [(c, 'appointment_reminder') for c in customers.data]


def get_customers_with_past_appointment():
    supabase = get_supabase()
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    customers = supabase.table('customers').select('*').gte(
        'next_booking', yesterday.isoformat()
    ).lt('next_booking', today_start.isoformat()).execute()

    return [(c, 'appointment_followup') for c in customers.data]


def get_next_sequence_day(current_day):
    next_days = {0: 1, 1: 3, 3: 15, 15: 30}
    return next_days.get(current_day, 'completed')


def get_template_name_for_day(sequence_day):
    templates = {0: 'vi_day1_welcome', 1: 'vi_day3_checkin',
                 3: 'vi_day15_followup', 15: 'vi_day30_upsell'}
    return templates.get(sequence_day)
