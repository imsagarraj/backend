from fastapi import APIRouter, Depends, HTTPException
from database.supabase_client import get_supabase
from dependencies import get_current_user, AuthUser
from services.message_pipeline import get_status
from datetime import datetime, timedelta, timezone, date

router = APIRouter()


@router.get("/dashboard")
def get_dashboard(user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    biz = supabase.table('business_profiles').select('id, active_agent_id').eq('user_id', user.id).execute()
    if not biz.data:
        raise HTTPException(status_code=404, detail="Business profile not found")
    business_id = biz.data[0]['id']

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    today_str = today.isoformat()
    week_str = week_ago.isoformat()

    today_sent = supabase.table('messages').select('*', count='exact').eq(
        'business_id', business_id
    ).eq('direction', 'sent').gte('timestamp', today_str).execute()

    today_replies = supabase.table('messages').select('*', count='exact').eq(
        'business_id', business_id
    ).eq('direction', 'received').gte('timestamp', today_str).execute()

    week_sent = supabase.table('messages').select('*', count='exact').eq(
        'business_id', business_id
    ).eq('direction', 'sent').gte('timestamp', week_str).execute()

    week_received = supabase.table('messages').select('*', count='exact').eq(
        'business_id', business_id
    ).eq('direction', 'received').gte('timestamp', week_str).execute()

    ts = today_sent.count if hasattr(today_sent, 'count') else len(today_sent.data)
    tr = today_replies.count if hasattr(today_replies, 'count') else len(today_replies.data)
    ws = week_sent.count if hasattr(week_sent, 'count') else len(week_sent.data)
    wr = week_received.count if hasattr(week_received, 'count') else len(week_received.data)

    week_response_rate = round((wr / ws * 100), 1) if ws > 0 else 0

    total_customers = supabase.table('customers').select('*', count='exact').eq(
        'business_id', business_id
    ).execute()

    active_customers = supabase.table('customers').select('*', count='exact').eq(
        'business_id', business_id
    ).eq('status', 'active').execute()

    completed_customers = supabase.table('customers').select('*', count='exact').eq(
        'business_id', business_id
    ).eq('status', 'completed').execute()

    recent = supabase.table('messages').select('*').eq(
        'business_id', business_id
    ).order('timestamp', desc=True).limit(10).execute()

    activity_list = []
    if recent.data:
        cust_ids = list(set(m['customer_id'] for m in recent.data))
        customers = supabase.table('customers').select('id, name').in_('id', cust_ids).execute()
        name_map = {c['id']: c['name'] for c in (customers.data or [])}
        for m in recent.data:
            activity_list.append({
                "customer_name": name_map.get(m['customer_id'], 'Unknown'),
                "direction": m['direction'],
                "content": (m.get('content') or '')[:50],
                "timestamp": m.get('timestamp')
            })

    pipeline = get_status(business_id)

    schedule_list = []
    pending = supabase.table('message_queue').select(
        'id, customer_id, message_type, sequence_day, stage, scheduled_at'
    ).eq('business_id', business_id).in_('stage', ['pending_schedule', 'pending_ai_gen', 'ready_to_send']).order('scheduled_at').limit(10).execute()

    if pending.data:
        cust_ids = list(set(item['customer_id'] for item in pending.data))
        customers = supabase.table('customers').select('id, name, product').in_('id', cust_ids).execute()
        cust_map = {c['id']: c for c in (customers.data or [])}
        for item in pending.data:
            c = cust_map.get(item['customer_id'], {})
            schedule_list.append({
                "customer_id": item['customer_id'],
                "name": c.get('name', 'Unknown'),
                "product": c.get('product', ''),
                "sequence_day": item.get('sequence_day', 0),
                "stage": item['stage'],
                "scheduled_at": item.get('scheduled_at'),
            })

    agent_info = None
    if biz.data and biz.data[0].get('active_agent_id'):
        agent = supabase.table('agents').select('agent_name').eq(
            'id', biz.data[0]['active_agent_id']
        ).execute()
        if agent.data:
            agent_info = {
                "name": agent.data[0]['agent_name'],
                "status": "active",
                "today_sent": ts,
                "today_replies": tr
            }

    return {
        "stats": {
            "today_sent": ts,
            "today_replies": tr,
            "week_response_rate": week_response_rate,
            "total_customers": total_customers.count if hasattr(total_customers, 'count') else len(total_customers.data),
            "active_customers": active_customers.count if hasattr(active_customers, 'count') else len(active_customers.data),
            "completed_customers": completed_customers.count if hasattr(completed_customers, 'count') else len(completed_customers.data)
        },
        "recent_activity": activity_list,
        "todays_schedule": schedule_list,
        "agent": agent_info,
        "pipeline": {
            "pending": pipeline['counts'].get('pending_schedule', 0) + pipeline['counts'].get('pending_ai_gen', 0) + pipeline['counts'].get('ready_to_send', 0),
            "sent_today": pipeline['counts'].get('sent', 0),
            "failed": pipeline['counts'].get('failed', 0),
        }
    }
