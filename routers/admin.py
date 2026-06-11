from fastapi import APIRouter, Depends, HTTPException
from database.supabase_client import get_supabase
from dependencies import get_admin_user, AuthUser
from services.message_pipeline import get_status, retry_failed, get_business_pipeline
from datetime import datetime, timezone

router = APIRouter()


@router.get("/admin/verify")
def admin_verify(admin: AuthUser = Depends(get_admin_user)):
    return {"is_admin": True, "email": admin.email}


@router.get("/admin/businesses")
def list_businesses(admin: AuthUser = Depends(get_admin_user)):
    supabase = get_supabase()
    businesses = supabase.table('business_profiles').select('*').order('created_at', desc=True).execute()

    result = []
    for biz in businesses.data:
        try:
            customers = supabase.table('customers').select('id').eq(
                'business_id', biz['id']
            ).execute()
            messages = supabase.table('messages').select('id').eq(
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
                'customer_count': len(customers.data) if customers.data else 0,
                'message_count': len(messages.data) if messages.data else 0,
                'pipeline': pipeline['counts'],
                'agent_name': agent_info,
            })
        except Exception:
            result.append({
                **biz,
                'customer_count': 0,
                'message_count': 0,
                'pipeline': {},
                'agent_name': None,
            })

    try:
        all_customers = supabase.table('customers').select('id', count='exact').execute()
        all_messages = supabase.table('messages').select('id', count='exact').execute()
        total_customers = all_customers.count if hasattr(all_customers, 'count') else len(all_customers.data or [])
        total_messages = all_messages.count if hasattr(all_messages, 'count') else len(all_messages.data or [])
    except Exception:
        total_customers = sum(b.get('customer_count', 0) for b in result)
        total_messages = sum(b.get('message_count', 0) for b in result)

    return {
        'businesses': result,
        'totals': {
            'customers': total_customers,
            'messages': total_messages,
        },
    }


@router.get("/admin/businesses/{business_id}")
def get_business_detail(business_id: int, admin: AuthUser = Depends(get_admin_user)):
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
def get_pipeline_status(business_id: int = None, admin: AuthUser = Depends(get_admin_user)):
    return get_status(business_id)


@router.post("/admin/pipeline/{item_id}/retry")
def retry_pipeline_item(item_id: int, admin: AuthUser = Depends(get_admin_user)):
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
def retry_all_failed(admin: AuthUser = Depends(get_admin_user)):
    return retry_failed()


@router.get("/admin/agents")
def list_agents(admin: AuthUser = Depends(get_admin_user)):
    supabase = get_supabase()
    agents = supabase.table('agents').select('*').execute()
    return agents.data


@router.put("/admin/agents/{agent_id}")
def update_agent(agent_id: int, data: dict, admin: AuthUser = Depends(get_admin_user)):
    supabase = get_supabase()
    allowed = {'agent_name', 'personality_description', 'system_prompt', 'tone_tags', 'is_active'}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    result = supabase.table('agents').update(updates).eq('id', agent_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Agent not found")
    return result.data[0]
