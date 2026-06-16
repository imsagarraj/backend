from fastapi import APIRouter, Depends, HTTPException
from database.supabase_client import get_supabase
from dependencies import get_current_user, get_user_business_id, AuthUser
from services.whatsapp_service import send_text_message
from database.seed import get_active_agent
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    goal: Optional[str] = None
    message: str = Field(..., min_length=1)
    tone: Optional[str] = 'auto'
    audience_type: Optional[str] = 'all'
    audience_filter: Optional[dict] = None
    schedule_type: Optional[str] = 'now'
    scheduled_at: Optional[str] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    message: Optional[str] = None
    status: Optional[str] = None
    tone: Optional[str] = None
    audience_type: Optional[str] = None
    audience_filter: Optional[dict] = None
    schedule_type: Optional[str] = None
    scheduled_at: Optional[str] = None


def _today_start():
    return datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)


def _get_target_count(supabase, biz_id, audience_type, audience_filter=None):
    query = supabase.table('customers').select('*', count='exact').eq('business_id', biz_id)

    if audience_type == 'inactive':
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        query = query.lt('last_contact', thirty_days_ago)
    elif audience_type == 'product' and audience_filter and audience_filter.get('product'):
        query = query.eq('product', audience_filter['product'])
    elif audience_type == 'custom' and audience_filter:
        if audience_filter.get('city'):
            query = query.eq('city', audience_filter['city'])
        if audience_filter.get('status'):
            query = query.eq('status', audience_filter['status'])
        if audience_filter.get('gender'):
            query = query.eq('gender', audience_filter['gender'])

    result = query.execute()
    return result.count if hasattr(result, 'count') else len(result.data)


def _get_target_customers(supabase, biz_id, audience_type, audience_filter=None):
    query = supabase.table('customers').select('*').eq('business_id', biz_id)

    if audience_type == 'inactive':
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        query = query.lt('last_contact', thirty_days_ago)
    elif audience_type == 'product' and audience_filter and audience_filter.get('product'):
        query = query.eq('product', audience_filter['product'])
    elif audience_type == 'custom' and audience_filter:
        if audience_filter.get('city'):
            query = query.eq('city', audience_filter['city'])
        if audience_filter.get('status'):
            query = query.eq('status', audience_filter['status'])
        if audience_filter.get('gender'):
            query = query.eq('gender', audience_filter['gender'])

    return query.execute().data


@router.post("/campaigns/estimate")
def estimate_campaign_audience(data: CampaignCreate, user: AuthUser = Depends(get_current_user), biz_id: int = Depends(get_user_business_id)):
    supabase = get_supabase()
    count = _get_target_count(supabase, biz_id, data.audience_type or 'all', data.audience_filter)
    return {"count": count}


@router.post("/campaigns")
def create_campaign(data: CampaignCreate, user: AuthUser = Depends(get_current_user), biz_id: int = Depends(get_user_business_id)):
    supabase = get_supabase()

    count = _get_target_count(supabase, biz_id, data.audience_type or 'all', data.audience_filter)

    payload = data.model_dump(mode='json')
    payload['business_id'] = biz_id
    payload['messages_sent'] = 0
    payload['responses'] = 0
    payload['response_rate'] = 0.0
    payload['status'] = 'draft'
    payload['estimated_reach'] = count

    result = supabase.table('campaigns').insert(payload).select().execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create campaign")

    return result.data[0]


@router.post("/campaigns/{campaign_id}/send")
def send_campaign(campaign_id: int, user: AuthUser = Depends(get_current_user), biz_id: int = Depends(get_user_business_id)):
    supabase = get_supabase()

    campaign = supabase.table('campaigns').select('*').eq('id', campaign_id).eq('business_id', biz_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign = campaign.data[0]

    if campaign['status'] in ('sent', 'sending'):
        raise HTTPException(status_code=400, detail="Campaign already sent or in progress")

    agent = get_active_agent(biz_id)
    if not agent:
        raise HTTPException(status_code=400, detail="No active AI agent assigned")

    business = supabase.table('business_profiles').select('*').eq('id', biz_id).execute()
    if not business.data:
        raise HTTPException(status_code=400, detail="Business profile not found")
    business = business.data[0]

    pn_id = business.get('meta_phone_number_id')
    if not pn_id:
        raise HTTPException(status_code=400, detail="WhatsApp not configured. Set up your WhatsApp number in Business Profile first.")

    supabase.table('campaigns').update({
        'status': 'sending',
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }).eq('id', campaign_id).execute()

    target_customers = _get_target_customers(supabase, biz_id, campaign['audience_type'], campaign.get('audience_filter'))
    sent_count = 0
    failed_list = []

    for customer in target_customers:
        if not customer.get('phone'):
            continue
        try:
            result = send_text_message(customer['phone'], campaign['message'], phone_number_id=pn_id)
            if result.get('status') == 'success':
                supabase.table('messages').insert({
                    'customer_id': customer['id'],
                    'business_id': biz_id,
                    'direction': 'sent',
                    'content': campaign['message'],
                    'status': 'sent',
                    'meta_message_id': result.get('message_id'),
                    'campaign_id': campaign_id,
                }).execute()
                sent_count += 1
            else:
                failed_list.append({"customer_id": customer['id'], "phone": customer['phone'], "error": result.get('error', 'Send failed')})
        except Exception as e:
            failed_list.append({"customer_id": customer['id'], "phone": customer['phone'], "error": str(e)[:100]})

    supabase.table('campaigns').update({
        'status': 'sent' if sent_count > 0 else 'failed',
        'messages_sent': sent_count,
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }).eq('id', campaign_id).execute()

    return {
        "sent": sent_count,
        "failed": len(failed_list),
        "total": len(target_customers),
        "failed_details": failed_list[:10],
    }


@router.get("/campaigns")
def list_campaigns(user: AuthUser = Depends(get_current_user), biz_id: int = Depends(get_user_business_id)):
    supabase = get_supabase()
    result = supabase.table('campaigns').select('*').eq('business_id', biz_id).order('created_at', desc=True).execute()
    return result.data


@router.get("/campaigns/{campaign_id}")
def get_campaign(campaign_id: int, user: AuthUser = Depends(get_current_user), biz_id: int = Depends(get_user_business_id)):
    supabase = get_supabase()
    result = supabase.table('campaigns').select('*').eq('id', campaign_id).eq('business_id', biz_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return result.data[0]


@router.patch("/campaigns/{campaign_id}")
def update_campaign(campaign_id: int, data: CampaignUpdate, user: AuthUser = Depends(get_current_user), biz_id: int = Depends(get_user_business_id)):
    supabase = get_supabase()
    payload = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    payload['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = supabase.table('campaigns').update(payload).eq('id', campaign_id).eq('business_id', biz_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return result.data[0]


@router.delete("/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int, user: AuthUser = Depends(get_current_user), biz_id: int = Depends(get_user_business_id)):
    supabase = get_supabase()
    result = supabase.table('campaigns').delete().eq('id', campaign_id).eq('business_id', biz_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "deleted"}
