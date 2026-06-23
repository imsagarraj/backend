from fastapi import APIRouter, Depends, HTTPException
from database.supabase_client import get_supabase
from dependencies import get_admin_user, AuthUser
from services.message_pipeline import get_status, retry_failed, get_business_pipeline
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from typing import Optional


class AgentUpdate(BaseModel):
    agent_name: Optional[str] = Field(None, min_length=1, max_length=200)
    personality_description: Optional[str] = Field(None, max_length=2000)
    system_prompt: Optional[str] = Field(None, max_length=10000)
    tone_tags: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None

router = APIRouter()


@router.get("/admin/verify")
def admin_verify(admin: AuthUser = Depends(get_admin_user)):
    return {"is_admin": True, "email": admin.email}


@router.get("/admin/businesses")
def list_businesses(admin: AuthUser = Depends(get_admin_user)):
    supabase = get_supabase()
    businesses = supabase.table('business_profiles').select('*').order('created_at', desc=True).execute()

    all_customers = supabase.table('customers').select('business_id').execute()
    all_messages = supabase.table('messages').select('business_id').execute()

    customer_counts = {}
    for c in (all_customers.data or []):
        bid = c.get('business_id')
        if bid is not None:
            customer_counts[bid] = customer_counts.get(bid, 0) + 1

    message_counts = {}
    for m in (all_messages.data or []):
        bid = m.get('business_id')
        if bid is not None:
            message_counts[bid] = message_counts.get(bid, 0) + 1

    result = []
    for biz in (businesses.data or []):
        agent_info = None
        if biz.get('active_agent_id'):
            agent = supabase.table('agents').select('agent_name').eq('id', biz['active_agent_id']).execute()
            if agent.data:
                agent_info = agent.data[0]['agent_name']
        pipeline = get_status(biz['id'])
        result.append({
            **biz,
            'customer_count': customer_counts.get(biz['id'], 0),
            'message_count': message_counts.get(biz['id'], 0),
            'pipeline': pipeline['counts'],
            'agent_name': agent_info,
        })

    return {
        'businesses': result,
        'totals': {
            'customers': len(all_customers.data or []),
            'messages': len(all_messages.data or []),
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
def get_pipeline_status(business_id: int, admin: AuthUser = Depends(get_admin_user)):
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


@router.post("/admin/fix-orphans")
def fix_orphan_customers(business_id: int, admin: AuthUser = Depends(get_admin_user)):
    supabase = get_supabase()
    biz = supabase.table('business_profiles').select('id').eq('id', business_id).execute()
    if not biz.data:
        raise HTTPException(status_code=404, detail="Business not found")
    result = supabase.table('customers').update({'business_id': business_id}).is_('business_id', 'null').execute()
    return {'fixed': len(result.data or [])}


@router.post("/admin/pipeline/retry-all")
def retry_all_failed(admin: AuthUser = Depends(get_admin_user)):
    return retry_failed()


@router.get("/admin/agents")
def list_agents(admin: AuthUser = Depends(get_admin_user)):
    supabase = get_supabase()
    agents = supabase.table('agents').select('*').execute()
    return agents.data


@router.put("/admin/agents/{agent_id}")
def update_agent(agent_id: int, data: AgentUpdate, admin: AuthUser = Depends(get_admin_user)):
    supabase = get_supabase()
    updates = data.model_dump(exclude_none=True, exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    result = supabase.table('agents').update(updates).eq('id', agent_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Agent not found")
    return result.data[0]
