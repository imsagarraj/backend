from fastapi import APIRouter, Depends, HTTPException
from database.supabase_client import get_supabase
from dependencies import get_current_user, AuthUser
from services.business_whatsapp_service import fetch_phone_number_id
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter()


class BusinessProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    gst: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_email: Optional[str] = None
    owner_designation: Optional[str] = None
    owner_dob: Optional[str] = None
    owner_gender: Optional[str] = None
    working_days: Optional[list[str]] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None


@router.put("/business-profile")
def upsert_business_profile(data: BusinessProfileUpdate, user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()

    payload = data.model_dump(exclude_none=True)
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
                pass

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
