from fastapi import APIRouter, Depends, HTTPException
from database.supabase_client import get_supabase
from dependencies import get_current_user, AuthUser
from services.business_whatsapp_service import fetch_phone_number_id
from pydantic import BaseModel, Field
from typing import Optional
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class BusinessProfileUpdate(BaseModel):
    model_config = {'extra': 'forbid'}
    business_name: Optional[str] = Field(None, max_length=200)
    business_type: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=320)
    phone: Optional[str] = Field(None, max_length=20)
    whatsapp: Optional[str] = Field(None, max_length=20)
    gst: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=10)
    website: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    owner_name: Optional[str] = Field(None, max_length=200)
    owner_phone: Optional[str] = Field(None, max_length=20)
    owner_email: Optional[str] = Field(None, max_length=320)
    owner_designation: Optional[str] = Field(None, max_length=100)
    owner_dob: Optional[str] = Field(None, max_length=10)
    owner_gender: Optional[str] = Field(None, max_length=16)
    working_days: Optional[list[str]] = None
    opening_time: Optional[str] = Field(None, max_length=10)
    closing_time: Optional[str] = Field(None, max_length=10)


@router.put("/business-profile")
def upsert_business_profile(data: BusinessProfileUpdate, user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()

    payload = data.model_dump(exclude_none=True, mode='json')
    payload['user_id'] = user.id

    existing = supabase.table('business_profiles').select('id, whatsapp, meta_phone_number_id').eq('user_id', user.id).execute()
    existing_biz = existing.data[0] if existing.data else None

    if existing_biz:
        result = supabase.table('business_profiles').update(payload).eq('id', existing_biz['id']).select().execute()
    else:
        result = supabase.table('business_profiles').insert(payload).select().execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save business profile")

    saved = result.data[0]

    whatsapp_number = data.whatsapp or saved.get('whatsapp')
    if whatsapp_number:
        old_whatsapp = existing_biz.get('whatsapp') if existing_biz else None
        if whatsapp_number != old_whatsapp or not saved.get('meta_phone_number_id'):
            try:
                waba_id = os.getenv('META_WABA_ID')
                if waba_id:
                    pn_id = fetch_phone_number_id(waba_id, whatsapp_number)
                    if pn_id:
                        supabase.table('business_profiles').update({
                            'meta_phone_number_id': pn_id,
                            'whatsapp_verified': True,
                        }).eq('id', saved['id']).execute()
                        saved['meta_phone_number_id'] = pn_id
                        saved['whatsapp_verified'] = True
            except Exception as e:
                logger.warning(f"WhatsApp sync failed: {e}")

    return {
        "business": saved,
        "whatsapp_sync": {
            "synced": bool(saved.get('meta_phone_number_id')),
            "phone_number_id": saved.get('meta_phone_number_id'),
        }
    }


@router.get("/business-profile")
def get_business_profile(user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table('business_profiles').select('*').eq('user_id', user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return result.data[0]


@router.delete("/business-profile")
def delete_business_account(user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()

    biz = supabase.table('business_profiles').select('id').eq('user_id', user.id).execute()
    if not biz.data:
        raise HTTPException(status_code=404, detail="Business profile not found")

    biz_id = biz.data[0]['id']

    customers = supabase.table('customers').select('id').eq('business_id', biz_id).execute()
    customer_ids = [c['id'] for c in (customers.data or [])]

    if customer_ids:
        supabase.table('conversation_history').delete().in_('customer_id', customer_ids).execute()
        supabase.table('messages').delete().in_('customer_id', customer_ids).execute()

    supabase.table('message_queue').delete().eq('business_id', biz_id).execute()
    supabase.table('campaigns').delete().eq('business_id', biz_id).execute()
    supabase.table('customers').delete().eq('business_id', biz_id).execute()
    supabase.table('business_profiles').delete().eq('id', biz_id).execute()

    return {"status": "deleted"}
