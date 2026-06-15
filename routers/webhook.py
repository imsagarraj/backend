from fastapi import APIRouter, Request, Response
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

from database.supabase_client import get_supabase
from database.seed import get_active_agent
from services.whatsapp_service import send_text_message, send_read_and_typing
from services.deepseek_service import generate_reply, detect_personality, extract_notes_from_conversation
from datetime import datetime, timezone

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
                metadata = value.get('metadata', {})
                pn_id = metadata.get('phone_number_id', '')
                messages = value.get('messages', [])
                for msg in messages:
                    if msg.get('type') == 'text':
                        phone = msg.get('from', '')
                        message_text = msg.get('text', {}).get('body', '')
                        message_id = msg.get('id', '')
                        await handle_incoming_message(phone, message_text, message_id, pn_id)
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")

    return {"status": "ok"}


async def handle_incoming_message(phone, message_text, message_id, pn_id=''):
    supabase = get_supabase()
    try:
        business = None
        if pn_id:
            biz_result = supabase.table('business_profiles').select('*').eq('meta_phone_number_id', pn_id).execute()
            if biz_result.data:
                business = biz_result.data[0]

        if not business:
            customers = supabase.table('customers').select('*').eq('phone', phone).execute()
            if not customers.data:
                logger.warning(f"Customer not found for phone: {phone}")
                return
            customer = customers.data[0]
            biz_id = customer.get('business_id')
            if biz_id:
                biz_result = supabase.table('business_profiles').select('*').eq('id', biz_id).execute()
                if biz_result.data:
                    business = biz_result.data[0]

        if not business:
            logger.warning(f"No business found for phone_number_id={pn_id} or customer phone={phone}")
            return

        biz_id = business['id']

        customers = supabase.table('customers').select('*').eq('phone', phone).eq('business_id', biz_id).execute()
        if not customers.data:
            logger.warning(f"Customer with phone {phone} not found in business {biz_id}")
            return

        customer = customers.data[0]

        supabase.table('messages').insert({
            'customer_id': customer['id'],
            'business_id': biz_id,
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

        agent = get_active_agent(biz_id)
        if not agent:
            logger.error(f"No agent available for business {biz_id}")
            return

        pn_id = business.get('meta_phone_number_id')
        send_read_and_typing(phone, message_id, pn_id)

        reply = generate_reply(customer, business, agent, message_text, history.data, supabase)

        send_result = send_text_message(phone, reply, phone_number_id=pn_id)

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

        full_history = supabase.table('conversation_history').select('*').eq(
            'customer_id', customer['id']
        ).order('timestamp').execute()

        latest = supabase.table('customers').select('notes').eq('id', customer['id']).execute()
        existing_notes = (latest.data[0].get('notes') or '').strip() if latest.data else ''

        extracted = extract_notes_from_conversation(customer, business, full_history.data)
        if extracted:
            timestamp = datetime.now(timezone.utc).strftime('%d %b %Y, %I:%M %p IST')
            entry = f"[{timestamp}] {extracted}"
            supabase.table('customers').update({
                'notes': existing_notes + '\n' + entry if existing_notes else entry
            }).eq('id', customer['id']).execute()

    except Exception as e:
        logger.error(f"Error handling incoming message: {e}")
