from fastapi import APIRouter, Depends
from database.supabase_client import get_supabase
from datetime import datetime, timedelta, timezone

router = APIRouter()


@router.get("/analytics")
def get_analytics(business_id: int, period: str = "30d"):
    supabase = get_supabase()
    days_map = {"7d": 7, "30d": 30, "90d": 90}
    num_days = days_map.get(period, 30)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=num_days)).isoformat()

    total = supabase.table('customers').select('*', count='exact').eq(
        'business_id', business_id
    ).execute()

    sent = supabase.table('messages').select('*', count='exact').eq(
        'business_id', business_id
    ).eq('direction', 'sent').gte('timestamp', cutoff).execute()

    received = supabase.table('messages').select('*', count='exact').eq(
        'business_id', business_id
    ).eq('direction', 'received').gte('timestamp', cutoff).execute()

    sent_count = sent.count if hasattr(sent, 'count') else len(sent.data)
    recv_count = received.count if hasattr(received, 'count') else len(received.data)
    response_rate = round((recv_count / sent_count * 100), 1) if sent_count > 0 else 0

    all_msgs = supabase.table('messages').select('timestamp,direction').eq(
        'business_id', business_id
    ).gte('timestamp', cutoff).order('timestamp').execute()

    messages_per_day = {}
    for m in all_msgs.data:
        day = m['timestamp'][:10] if m.get('timestamp') else 'unknown'
        if day not in messages_per_day:
            messages_per_day[day] = {"date": day, "sent": 0, "received": 0}
        messages_per_day[day][m['direction']] += 1

    return {
        "total_customers": total.count if hasattr(total, 'count') else len(total.data),
        "messages_sent": sent_count,
        "messages_received": recv_count,
        "response_rate": response_rate,
        "messages_per_day": sorted(messages_per_day.values(), key=lambda x: x["date"])
    }
