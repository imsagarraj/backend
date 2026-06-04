from fastapi import APIRouter, Request, Response
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

from database.supabase_client import get_supabase
from database.seed import get_active_agent
from services.whatsapp_service import send_text_message
from services.gemini_service import generate_reply, detect_personality
from datetime import datetime, timedelta, timezone

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)
logger = logging.getLogger(__name__)

VERIFY_TOKEN = os.getenv('META_VERIFY_TOKEN')

router = APIRouter()


@router.get("/webhook/whatsapp")
async def verify_webhook(request: Request):
    mode = request.query_params.get('hub.mode')
    token = request.query_params.get('hub.verify_token')
    challenge = request.query_params.get('hub.challenge')

    if mode == 'subscribe' and token == VERIFY_TOKEN and challenge:
        return Response(content=challenge, media_type='text/plain')

    return Response(content='Verification failed', status_code=403)


@router.post("/webhook/whatsapp")
async def receive_webhook(request: Request):
    try:
        body = await request.json()
    except Exception:
        return {"status": "ok"}

    try:
        entries = body.get('entry', [])
        for entry in entries:
            changes = entry.get('changes', [])
            for change in changes:
                value = change.get('value', {})

                statuses = value.get('statuses', [])
                for status in statuses:
                    await handle_status_update(status)

                messages = value.get('messages', [])
                for msg in messages:
                    if msg.get('type') == 'text':
                        phone = msg.get('from', '')
                        message_text = msg.get('text', {}).get('body', '')
                        message_id = msg.get('id', '')
                        await handle_incoming_message(phone, message_text, message_id)
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")

    return {"status": "ok"}


async def handle_status_update(status):
    supabase = get_supabase()
    try:
        msg_id = status.get('id')
        status_type = status.get('status')
        timestamp = status.get('timestamp')
        recipient_id = status.get('recipient_id')

        if not msg_id:
            return

        if status_type in ('delivered', 'read'):
            supabase.table('messages').update({
                'status': status_type,
            }).eq('meta_message_id', msg_id).execute()

        if status_type == 'read' and recipient_id and timestamp:
            customers = supabase.table('customers').select('*').eq('phone', recipient_id).execute()
            if customers.data:
                customer = customers.data[0]
                ts = datetime.fromtimestamp(timestamp, tz=timezone.utc)
                ist = ts + timedelta(hours=5, minutes=30)
                supabase.table('customers').update({
                    'best_contact_time': f"{ist.hour:02d}:00",
                }).eq('id', customer['id']).execute()
    except Exception as e:
        logger.error(f"Error handling status update: {e}")


async def handle_incoming_message(phone, message_text, message_id):
    supabase = get_supabase()
    try:
        customers = supabase.table('customers').select('*').eq('phone', phone).execute()
        if not customers.data:
            logger.warning(f"Customer not found for phone: {phone}")
            return

        customer = customers.data[0]

        supabase.table('messages').insert({
            'customer_id': customer['id'],
            'business_id': customer.get('business_id'),
            'direction': 'received',
            'content': message_text,
            'status': 'received',
            'meta_message_id': message_id,
        }).execute()

        supabase.table('conversation_history').insert({
            'customer_id': customer['id'],
            'role': 'user',
            'content': message_text,
        }).execute()

        response_count = (customer.get('response_count') or 0) + 1
        personality = detect_personality(message_text)
        supabase.table('customers').update({
            'response_count': response_count,
            'last_contact': datetime.now(timezone.utc).isoformat(),
            'personality_profile': personality,
        }).eq('id', customer['id']).execute()

        history = supabase.table('conversation_history').select('*').eq(
            'customer_id', customer['id']
        ).order('timestamp').execute()

        biz_id = customer.get('business_id')
        if not biz_id:
            logger.error(f"No business_id for customer {customer['id']}")
            return

        biz = supabase.table('business_profiles').select('*').eq('id', biz_id).execute()
        if not biz.data:
            logger.error(f"Business not found for id {biz_id}")
            return
        business = biz.data[0]

        agent = get_active_agent(biz_id)
        if not agent:
            logger.error(f"No agent available for business {biz_id}")
            return

        reply = generate_reply(customer, business, agent, message_text, history.data, supabase)

        send_result = send_text_message(phone, reply)

        supabase.table('messages').insert({
            'customer_id': customer['id'],
            'business_id': biz_id,
            'direction': 'sent',
            'content': reply,
            'status': 'sent',
            'meta_message_id': send_result.get('message_id'),
        }).execute()

        supabase.table('conversation_history').insert({
            'customer_id': customer['id'],
            'role': 'model',
            'content': reply,
        }).execute()

    except Exception as e:
        logger.error(f"Error handling incoming message: {e}")
