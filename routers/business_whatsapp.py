from fastapi import APIRouter, HTTPException
from database.supabase_client import get_supabase
from services.business_whatsapp_service import fetch_phone_number_id
import os

router = APIRouter()


@router.post("/businesses/{business_id}/whatsapp/sync")
def sync_whatsapp_number(business_id: int):
    supabase = get_supabase()

    biz = supabase.table('business_profiles').select('*').eq('id', business_id).execute()
    if not biz.data:
        raise HTTPException(status_code=404, detail="Business not found")

    business = biz.data[0]
    phone = business.get('whatsapp') or business.get('whatsapp_phone')
    if not phone:
        raise HTTPException(status_code=400, detail="No WhatsApp number set in business profile")

    waba_id = os.getenv('META_WABA_ID')
    if not waba_id:
        raise HTTPException(status_code=500, detail="META_WABA_ID not configured")

    pn_id = fetch_phone_number_id(waba_id, phone)
    if not pn_id:
        raise HTTPException(
            status_code=404,
            detail=f"Phone number {phone} not found in your WABA. Add it in Meta Business Manager first."
        )

    supabase.table('business_profiles').update({
        'whatsapp_phone': phone,
        'meta_phone_number_id': pn_id,
        'whatsapp_verified': True,
    }).eq('id', business_id).execute()

    return {"status": "synced", "phone_number_id": pn_id, "phone": phone}
