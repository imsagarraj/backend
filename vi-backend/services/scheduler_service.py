from datetime import date, datetime, timedelta, timezone
from database.supabase_client import get_supabase
from services.festival_utils import (
    get_next_sequence_day_varied, get_upcoming_festivals,
    is_weekend_approach, should_send_weekend_message,
    get_festival_message_context, is_friday,
)
import logging

logger = logging.getLogger(__name__)


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

        next_seq = get_next_sequence_day_varied(current_seq)
        if next_seq != 'completed' and days_since >= next_seq and current_seq < next_seq:
            due.append((c, next_seq))
            continue

        if current_seq >= 28 and days_since >= 30:
            due.append((c, 30))

    return due


def get_customers_due_for_weekend():
    supabase = get_supabase()
    customers = supabase.table('customers').select('*').eq('status', 'active').execute()

    due = []
    for c in customers.data:
        biz_id = c.get('business_id')
        if not biz_id:
            continue
        biz = supabase.table('business_profiles').select('business_type').eq('id', biz_id).execute()
        if not biz.data:
            continue
        biz_type = biz.data[0].get('business_type', '')
        if should_send_weekend_message(biz_type):
            due.append(c)

    return due


def get_customers_for_upcoming_festival():
    supabase = get_supabase()
    customers = supabase.table('customers').select('*').eq('status', 'active').execute()

    due = []
    processed_biz = {}

    for c in customers.data:
        biz_id = c.get('business_id')
        if not biz_id:
            continue
        if biz_id in processed_biz:
            context = processed_biz[biz_id]
        else:
            biz = supabase.table('business_profiles').select('*').eq('id', biz_id).execute()
            if not biz.data:
                continue
            context = get_festival_message_context(biz.data[0], c)
            processed_biz[biz_id] = context

        if context:
            due.append((c, context))

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
    return get_next_sequence_day_varied(current_day)


def get_template_name_for_day(sequence_day):
    templates = {0: 'vi_day1_welcome', 1: 'vi_day3_checkin',
                 3: 'vi_day15_followup', 15: 'vi_day30_upsell'}
    return templates.get(sequence_day)


def get_customers_available_at_time(target_hour):
    supabase = get_supabase()
    customers = supabase.table('customers').select('*').eq('status', 'active').execute()

    matched = []
    for c in customers.data:
        bct = c.get('best_contact_time')
        if bct:
            try:
                hour = int(bct.split(':')[0])
                if hour == target_hour:
                    matched.append(c)
                    continue
            except (ValueError, TypeError):
                pass
        matched.append(c)

    return matched
