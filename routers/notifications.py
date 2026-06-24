from fastapi import APIRouter, Depends
from database.supabase_client import get_supabase
from dependencies import get_current_user, AuthUser
from datetime import datetime, timedelta, timezone

router = APIRouter()


@router.get("/notifications")
def get_notifications(user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    biz = supabase.table('business_profiles').select('id').eq('user_id', user.id).execute()
    if not biz.data:
        return {"notifications": []}
    business_id = biz.data[0]['id']

    now = datetime.now(timezone.utc)
    notifications = []

    # 1. Recent replies (last 24h)
    replies = supabase.table('messages').select('customer_id,content,timestamp').eq(
        'business_id', business_id
    ).eq('direction', 'received').gte('timestamp', (now - timedelta(hours=24)).isoformat()).order('timestamp', desc=True).limit(5).execute()

    if replies.data:
        cust_ids = list(set(m['customer_id'] for m in replies.data))
        customers = supabase.table('customers').select('id,name').in_('id', cust_ids).execute()
        name_map = {c['id']: c['name'] for c in (customers.data or [])}
        for m in replies.data:
            notifications.append({
                "type": "reply",
                "message": f"{name_map.get(m['customer_id'], 'Someone')} replied",
                "detail": (m.get('content') or '')[:80],
                "timestamp": m['timestamp'],
                "customer_id": m['customer_id'],
            })

    # 2. Failed messages
    failed = supabase.table('message_queue').select('id', count='exact').eq(
        'business_id', business_id
    ).eq('stage', 'failed').execute()

    failed_count = failed.count if hasattr(failed, 'count') else len(failed.data or [])
    if failed_count > 0:
        notifications.append({
            "type": "failed",
            "message": f"{failed_count} message(s) failed to send",
            "detail": "Review and retry in message queue",
            "timestamp": now.isoformat(),
        })

    # 3. Upcoming schedule (next 2 hours)
    upcoming = supabase.table('message_queue').select('id', count='exact').eq(
        'business_id', business_id
    ).in_('stage', ['pending_schedule', 'pending_ai_gen', 'ready_to_send']).gte('scheduled_at', now.isoformat()).lte('scheduled_at', (now + timedelta(hours=2)).isoformat()).execute()

    upcoming_count = upcoming.count if hasattr(upcoming, 'count') else len(upcoming.data or [])
    if upcoming_count > 0:
        notifications.append({
            "type": "schedule",
            "message": f"{upcoming_count} message(s) due in next 2 hours",
            "detail": "Follow-ups ready to be sent",
            "timestamp": now.isoformat(),
        })

    # 4. Daily summary (today's reply count)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_replies = supabase.table('messages').select('id', count='exact').eq(
        'business_id', business_id
    ).eq('direction', 'received').gte('timestamp', today.isoformat()).execute()

    reply_count = today_replies.count if hasattr(today_replies, 'count') else len(today_replies.data or [])
    if reply_count > 0:
        notifications.insert(0, {
            "type": "summary",
            "message": f"{reply_count} new customer response(s) today",
            "detail": "Customers are engaging with your messages",
            "timestamp": now.isoformat(),
        })

    # Sort by timestamp descending
    notifications.sort(key=lambda n: n['timestamp'], reverse=True)

    return {"notifications": notifications}
