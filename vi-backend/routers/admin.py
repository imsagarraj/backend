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

    total_customers = len(all_customers.data or [])
    total_messages = len(all_messages.data or [])

    unmatched = [bid for bid in customer_counts if bid not in {b['id'] for b in (businesses.data or [])}]

    return {
        'businesses': result,
        'totals': {
            'customers': total_customers,
            'messages': total_messages,
        },
        '_debug': {
            'customer_counts_by_biz': customer_counts,
            'message_counts_by_biz': message_counts,
            'unmatched_business_ids_in_customers': unmatched,
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


@router.post("/admin/fix-orphans")
def fix_orphan_customers(admin: AuthUser = Depends(get_admin_user)):
    supabase = get_supabase()
    biz = supabase.table('business_profiles').select('id').limit(1).execute()
    if not biz.data:
        return {'fixed': 0, 'error': 'No business profiles found'}
    biz_id = biz.data[0]['id']
    result = supabase.table('customers').update({'business_id': biz_id}).is_('business_id', 'null').execute()
    return {'fixed': len(result.data or [])}


@router.post("/admin/pipeline/retry-all")
def retry_all_failed(admin: AuthUser = Depends(get_admin_user)):
    return retry_failed()


@router.get("/admin/followups")
def list_followups(admin: AuthUser = Depends(get_admin_user)):
    supabase = get_supabase()
    seqs = supabase.table('follow_up_sequences').select('*').order('scheduled_date', desc=True).limit(100).execute()
    items = seqs.data or []

    cust_ids = list(set(s['customer_id'] for s in items if s.get('customer_id')))
    biz_ids = list(set(s['business_id'] for s in items if s.get('business_id')))

    custs = {}
    if cust_ids:
        c = supabase.table('customers').select('id,name,phone,status,current_sequence_day,purchase_date').in_('id', cust_ids).execute()
        custs = {r['id']: r for r in (c.data or [])}

    bizs = {}
    if biz_ids:
        b = supabase.table('business_profiles').select('id,business_name').in_('id', biz_ids).execute()
        bizs = {r['id']: r for r in (b.data or [])}

    for s in items:
        s['customer'] = custs.get(s.get('customer_id'))
        s['business'] = bizs.get(s.get('business_id'))

    return items


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
