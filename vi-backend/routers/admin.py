from fastapi import APIRouter, Depends, HTTPException, Request
from database.supabase_client import get_supabase
from services.message_pipeline import get_status, retry_failed, get_business_pipeline
from datetime import datetime, timezone
from supabase import create_client
import os

router = APIRouter()


async def verify_admin(request: Request):
    ADMIN_EMAILS = os.getenv('ADMIN_EMAILS', '').split(',')
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing auth token")

    supabase = create_client(
        os.getenv('VITE_SUPABASE_URL'),
        os.getenv('VITE_SUPABASE_ANON_KEY')
    )
    token = auth_header.replace('Bearer ', '')
    user = supabase.auth.get_user(token)
    email = user.user.email if user.user else None

    if not email or email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")

    return user.user


@router.get("/admin/verify")
def admin_verify(admin=Depends(verify_admin)):
    return {"is_admin": True, "email": admin.email}


@router.get("/admin/businesses")
def list_businesses(admin=Depends(verify_admin)):
    supabase = get_supabase()
    businesses = supabase.table('business_profiles').select('*').order('created_at', desc=True).execute()

    result = []
    for biz in businesses.data:
        customer_count = supabase.table('customers').select('id', count='exact').eq(
            'business_id', biz['id']
        ).execute()
        msg_count = supabase.table('messages').select('id', count='exact').eq(
            'business_id', biz['id']
        ).execute()
        pipeline = get_status(biz['id'])
        agent_info = None
        if biz.get('active_agent_id'):
            agent = supabase.table('agents').select('agent_name').eq('id', biz['active_agent_id']).execute()
            if agent.data:
                agent_info = agent.data[0]['agent_name']
        result.append({
            **biz,
            'customer_count': customer_count.count if hasattr(customer_count, 'count') else 0,
            'message_count': msg_count.count if hasattr(msg_count, 'count') else 0,
            'pipeline': pipeline['counts'],
            'agent_name': agent_info,
        })
    return result


@router.get("/admin/businesses/{business_id}")
def get_business_detail(business_id: int, admin=Depends(verify_admin)):
    supabase = get_supabase()
    biz = supabase.table('business_profiles').select('*').eq('id', business_id).execute()
    if not biz.data:
        raise HTTPException(status_code=404, detail="Business not found")

    customers = supabase.table('customers').select('*').eq('business_id', business_id).execute()
    queue = get_business_pipeline(business_id)
    messages = supabase.table('messages').select('*').eq('business_id', business_id).order('timestamp', desc=True).limit(50).execute()

    agent_info = None
    if biz.data[0].get('active_agent_id'):
        agent = supabase.table('agents').select('*').eq('id', biz.data[0]['active_agent_id']).execute()
        if agent.data:
            agent_info = agent.data[0]

    return {
        'business': biz.data[0],
        'customers': customers.data,
        'pipeline': queue,
        'recent_messages': messages.data,
        'agent': agent_info,
    }


@router.get("/admin/pipeline")
def get_pipeline_status(business_id: int = None, admin=Depends(verify_admin)):
    supabase = get_supabase()
    status = get_status(business_id)

    queue_query = supabase.table('message_queue').select(
        'id, customer_id, business_id, message_type, stage, sequence_day, '
        'ai_generated_text, error_log, retry_count, max_retries, scheduled_at, sent_at, created_at, updated_at'
    ).order('created_at', desc=True).limit(100)

    if business_id:
        queue_query = queue_query.eq('business_id', business_id)

    queue_items = queue_query.execute()

    for item in queue_items.data:
        if item.get('customer_id'):
            cust = supabase.table('customers').select('name, phone').eq('id', item['customer_id']).execute()
            item['customer_name'] = cust.data[0]['name'] if cust.data else 'Unknown'
            item['customer_phone'] = cust.data[0]['phone'] if cust.data else ''
        else:
            item['customer_name'] = 'Unknown'
            item['customer_phone'] = ''
        if item.get('business_id'):
            biz = supabase.table('business_profiles').select('business_name').eq('id', item['business_id']).execute()
            item['business_name'] = biz.data[0]['business_name'] if biz.data else 'Unknown'
        else:
            item['business_name'] = ''

    return {**status, 'items': queue_items.data}


@router.post("/admin/pipeline/{item_id}/retry")
def retry_pipeline_item(item_id: int, admin=Depends(verify_admin)):
    supabase = get_supabase()
    item = supabase.table('message_queue').select('*').eq('id', item_id).execute()
    if not item.data:
        raise HTTPException(status_code=404, detail="Queue item not found")

    supabase.table('message_queue').update({
        'stage': 'pending_ai_gen',
        'error_log': None,
        'retry_count': 0,
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }).eq('id', item_id).execute()

    return {'status': 'retried', 'item_id': item_id}


@router.post("/admin/pipeline/retry-all")
def retry_all_failed(admin=Depends(verify_admin)):
    return retry_failed()


@router.post("/admin/pipeline/{item_id}/cancel")
def cancel_pipeline_item(item_id: int, admin=Depends(verify_admin)):
    supabase = get_supabase()
    item = supabase.table('message_queue').select('*').eq('id', item_id).execute()
    if not item.data:
        raise HTTPException(status_code=404, detail="Queue item not found")
    if item.data[0]['stage'] in ('sent', 'failed', 'dead', 'cancelled'):
        raise HTTPException(status_code=400, detail=f"Cannot cancel item in stage '{item.data[0]['stage']}'")

    supabase.table('message_queue').update({
        'stage': 'cancelled',
        'error_log': 'Cancelled by admin',
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }).eq('id', item_id).execute()

    return {'status': 'cancelled', 'item_id': item_id}


@router.delete("/admin/pipeline/{item_id}")
def delete_pipeline_item(item_id: int, admin=Depends(verify_admin)):
    supabase = get_supabase()
    item = supabase.table('message_queue').select('id').eq('id', item_id).execute()
    if not item.data:
        raise HTTPException(status_code=404, detail="Queue item not found")

    supabase.table('message_queue').delete().eq('id', item_id).execute()
    return {'status': 'deleted', 'item_id': item_id}


@router.get("/admin/agents")
def list_agents(admin=Depends(verify_admin)):
    supabase = get_supabase()
    agents = supabase.table('agents').select('*').execute()
    return agents.data


@router.put("/admin/agents/{agent_id}")
def update_agent(agent_id: int, data: dict, admin=Depends(verify_admin)):
    supabase = get_supabase()
    allowed = {'agent_name', 'personality_description', 'system_prompt', 'tone_tags', 'is_active'}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    result = supabase.table('agents').update(updates).eq('id', agent_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Agent not found")
    return result.data[0]
