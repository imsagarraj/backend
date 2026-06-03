from fastapi import APIRouter, Depends, HTTPException
from database.supabase_client import get_supabase
from services.whatsapp_service import send_text_message
from pydantic import BaseModel

router = APIRouter()


class SendMessage(BaseModel):
    customer_id: int
    message_text: str


@router.get("/messages")
def list_messages(customer_id: int):
    supabase = get_supabase()
    messages = supabase.table('messages').select('*').eq(
        'customer_id', customer_id
    ).order('timestamp').execute()
    return messages.data


@router.post("/messages/send")
def send_message(data: SendMessage):
    supabase = get_supabase()
    customer = supabase.table('customers').select('*').eq('id', data.customer_id).execute()
    if not customer.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer = customer.data[0]
    send_result = send_text_message(customer['phone'], data.message_text)

    msg = supabase.table('messages').insert({
        'customer_id': customer['id'],
        'business_id': customer.get('business_id'),
        'direction': 'sent',
        'content': data.message_text,
        'status': 'sent',
        'meta_message_id': send_result.get('message_id')
    }).execute()

    return msg.data[0]
