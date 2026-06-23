from fastapi import APIRouter, Depends, HTTPException, Request
from database.supabase_client import get_supabase
from dependencies import get_current_user, AuthUser
from services.whatsapp_service import send_text_message
from pydantic import BaseModel, Field
from typing import Annotated
from rate_limit import limiter

router = APIRouter()


class SendMessage(BaseModel):
    customer_id: int
    message_text: str = Field(..., min_length=1, max_length=4096)


@router.get("/messages")
def list_messages(customer_id: int, user: AuthUser = Depends(get_current_user), page: Annotated[int, Field(ge=1)] = 1, limit: Annotated[int, Field(ge=1, le=200)] = 50):
    supabase = get_supabase()
    customer = supabase.table('customers').select('user_id, business_id').eq('id', customer_id).execute()
    if not customer.data or customer.data[0]['user_id'] != user.id:
        raise HTTPException(status_code=404, detail="Customer not found")

    biz_id = customer.data[0].get('business_id')
    query = supabase.table('messages').select('*', count='exact').eq(
        'customer_id', customer_id
    )
    if biz_id:
        query = query.eq('business_id', biz_id)
    query = query.order('timestamp', desc=True).range((page - 1) * limit, page * limit - 1)
    result = query.execute()
    total = result.count if hasattr(result, 'count') else len(result.data)
    return {"messages": result.data, "total": total, "page": page, "limit": limit}


@router.post("/messages/send")
@limiter.limit("20/minute")
def send_message(request: Request, data: SendMessage, user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    customer = supabase.table('customers').select('*').eq('id', data.customer_id).eq('user_id', user.id).execute()
    if not customer.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer = customer.data[0]
    biz_id = customer.get('business_id')
    pn_id = None
    if biz_id:
        biz = supabase.table('business_profiles').select('meta_phone_number_id').eq('id', biz_id).execute()
        if biz.data and biz.data[0].get('meta_phone_number_id'):
            pn_id = biz.data[0]['meta_phone_number_id']

    send_result = send_text_message(customer['phone'], data.message_text, phone_number_id=pn_id)
    status = 'sent' if send_result.get('status') == 'success' else 'failed'

    msg = supabase.table('messages').insert({
        'customer_id': customer['id'],
        'business_id': biz_id,
        'direction': 'sent',
        'content': data.message_text,
        'status': status,
        'meta_message_id': send_result.get('message_id')
    }).execute()

    return {"message": msg.data[0]}
