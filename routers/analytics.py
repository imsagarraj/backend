from fastapi import APIRouter, Depends, HTTPException
from database.supabase_client import get_supabase
from dependencies import get_current_user, AuthUser
from datetime import datetime, timedelta, timezone
from pydantic import Field
from typing import Annotated

router = APIRouter()


@router.get("/analytics")
def get_analytics(period: Annotated[str, Field(pattern=r'^(7d|30d|90d)$')] = "30d", user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    biz = supabase.table('business_profiles').select('id').eq('user_id', user.id).execute()
    if not biz.data:
        raise HTTPException(status_code=404, detail="Business profile not found")
    business_id = biz.data[0]['id']

    days_map = {"7d": 7, "30d": 30, "90d": 90}
    num_days = days_map[period]
    cutoff = (datetime.now(timezone.utc) - timedelta(days=num_days)).isoformat()

    total = supabase.table('customers').select('*', count='exact').eq(
        'business_id', business_id
    ).execute()

    sent = supabase.table('messages').select('customer_id', count='exact').eq(
        'business_id', business_id
    ).eq('direction', 'sent').gte('timestamp', cutoff).execute()

    received = supabase.table('messages').select('customer_id', count='exact').eq(
        'business_id', business_id
    ).eq('direction', 'received').gte('timestamp', cutoff).execute()

    sent_count = sent.count if hasattr(sent, 'count') else len(sent.data)
    recv_count = received.count if hasattr(received, 'count') else len(received.data)

    sent_customers = len(set(m['customer_id'] for m in (sent.data or [])))
    recv_customers = len(set(m['customer_id'] for m in (received.data or [])))
    response_rate = round((recv_customers / sent_customers * 100), 1) if sent_customers > 0 else 0

    all_msgs = supabase.table('messages').select('timestamp,direction').eq(
        'business_id', business_id
    ).gte('timestamp', cutoff).order('timestamp').limit(10000).execute()

    messages_per_day = {}
    for m in (all_msgs.data or []):
        day = m['timestamp'][:10] if m.get('timestamp') else 'unknown'
        if day not in messages_per_day:
            messages_per_day[day] = {"date": day, "sent": 0, "received": 0}
        messages_per_day[day][m['direction']] += 1

    return {
        "total_customers": total.count if hasattr(total, 'count') else len(total.data),
        "messages_sent": sent_count,
        "messages_received": recv_count,
        "responding_customers": recv_customers,
        "messaged_customers": sent_customers,
        "response_rate": response_rate,
        "messages_per_day": sorted(messages_per_day.values(), key=lambda x: x["date"])
    }
