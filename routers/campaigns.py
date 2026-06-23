from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from database.supabase_client import get_supabase
from dependencies import get_current_user, get_user_business_id, AuthUser
from services.campaign_service import execute_campaign
from pydantic import BaseModel, Field
from typing import Optional, Annotated
from datetime import datetime, timezone, timedelta
import logging
from rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter()


class AudienceFilter(BaseModel):
    model_config = {'extra': 'forbid'}
    product: Optional[str] = Field(None, max_length=200)
    city: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, max_length=20)
    gender: Optional[str] = Field(None, max_length=16)


class CampaignCreate(BaseModel):
    model_config = {'extra': 'forbid'}
    name: str = Field(..., min_length=1, max_length=200)
    goal: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=4096)
    tone: Optional[str] = 'auto'
    audience_type: Optional[str] = 'all'
    audience_filter: Optional[AudienceFilter] = None
    schedule_type: Optional[str] = 'now'
    scheduled_at: Optional[str] = None


IMMUTABLE_AFTER_SENT = {'schedule_type', 'audience_type', 'audience_filter', 'message'}


class CampaignUpdate(BaseModel):
    model_config = {'extra': 'forbid'}
    name: Optional[str] = Field(None, max_length=200)
    message: Optional[str] = Field(None, max_length=4096)
    status: Optional[str] = None
    tone: Optional[str] = None
    audience_type: Optional[str] = None
    audience_filter: Optional[AudienceFilter] = None
    schedule_type: Optional[str] = None
    scheduled_at: Optional[str] = None


def _get_target_count(supabase, biz_id, audience_type, audience_filter=None):
    query = supabase.table('customers').select('*', count='exact').eq('business_id', biz_id)

    if audience_type == 'inactive':
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        query = query.lt('last_contact', thirty_days_ago)
    elif audience_type == 'product' and audience_filter and audience_filter.product:
        query = query.eq('product', audience_filter.product)
    elif audience_type == 'custom' and audience_filter:
        if audience_filter.city:
            query = query.eq('city', audience_filter.city)
        if audience_filter.status:
            query = query.eq('status', audience_filter.status)
        if audience_filter.gender:
            query = query.eq('gender', audience_filter.gender)

    result = query.execute()
    return result.count if hasattr(result, 'count') else len(result.data)


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
@limiter.limit("5/minute")
def send_campaign(campaign_id: int, request: Request, background_tasks: BackgroundTasks, user: AuthUser = Depends(get_current_user), biz_id: int = Depends(get_user_business_id)):
    supabase = get_supabase()

    campaign = supabase.table('campaigns').select('*').eq('id', campaign_id).eq('business_id', biz_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign = campaign.data[0]

    business = supabase.table('business_profiles').select('*').eq('id', biz_id).execute()
    if not business.data:
        raise HTTPException(status_code=400, detail="Business profile not found")
    business = business.data[0]

    if not business.get('meta_phone_number_id'):
        raise HTTPException(status_code=400, detail="WhatsApp not configured. Set up your WhatsApp number in Business Profile first.")

    result = supabase.table('campaigns').update({
        'status': 'sending',
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }).eq('id', campaign_id).eq('status', 'draft').execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Campaign already sent or in progress")

    background_tasks.add_task(execute_campaign, campaign, business)

    return {
        "status": "queued",
    }


@router.get("/campaigns")
def list_campaigns(user: AuthUser = Depends(get_current_user), biz_id: int = Depends(get_user_business_id), page: Annotated[int, Field(ge=1)] = 1, limit: Annotated[int, Field(ge=1, le=200)] = 50):
    supabase = get_supabase()
    query = supabase.table('campaigns').select('*', count='exact').eq('business_id', biz_id)
    query = query.order('created_at', desc=True).range((page - 1) * limit, page * limit - 1)
    result = query.execute()
    total = result.count if hasattr(result, 'count') else len(result.data)
    return {"campaigns": result.data, "total": total, "page": page, "limit": limit}


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

    existing = supabase.table('campaigns').select('status').eq('id', campaign_id).eq('business_id', biz_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if existing.data[0]['status'] in ('sent', 'sending'):
        changed_immutable = IMMUTABLE_AFTER_SENT & payload.keys()
        if changed_immutable:
            raise HTTPException(status_code=400, detail=f"Cannot change fields after sending: {', '.join(changed_immutable)}")

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
