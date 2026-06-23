from fastapi import APIRouter, Request, Response
from dotenv import load_dotenv
from pathlib import Path
import os
import hmac
import hashlib
import logging
from pydantic import BaseModel, Field
from typing import Optional

from database.supabase_client import get_supabase
from database.seed import get_active_agent
from services.whatsapp_service import send_text_message, send_read_and_typing
from services.deepseek_service import generate_reply, detect_personality, extract_notes_from_conversation
from datetime import datetime, timedelta, timezone


class ReactionEntry(BaseModel):
    emoji: str = Field(default='', max_length=32)
    message_id: Optional[str] = None


class TextEntry(BaseModel):
    body: str = Field(default='', max_length=4096)


class MessageEntry(BaseModel):
    from_: str = Field(alias='from', default='', max_length=20)
    id: str = Field(default='', max_length=64)
    type: str = Field(default='', max_length=16)
    text: Optional[TextEntry] = None
    reaction: Optional[ReactionEntry] = None


class MetadataEntry(BaseModel):
    phone_number_id: str = Field(default='', max_length=32)


class ValueEntry(BaseModel):
    metadata: Optional[MetadataEntry] = None
    messages: list[MessageEntry] = Field(default=[])


class ChangeEntry(BaseModel):
    value: Optional[ValueEntry] = None


class WebhookEntry(BaseModel):
    changes: list[ChangeEntry] = Field(default=[])


class WebhookPayload(BaseModel):
    entry: list[WebhookEntry] = Field(default=[])

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)
logger = logging.getLogger(__name__)

VERIFY_TOKEN = os.getenv('META_VERIFY_TOKEN')
APP_SECRET = os.getenv('META_APP_SECRET')

router = APIRouter()


def verify_webhook_signature(raw_body: bytes, signature_header: str) -> bool:
    if not APP_SECRET or not signature_header:
        return False
    expected = hmac.new(
        APP_SECRET.encode(),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    prefix = 'sha256='
    if signature_header.startswith(prefix):
        received = signature_header[len(prefix):]
    else:
        received = signature_header
    return hmac.compare_digest(f'sha256={expected}', f'sha256={received}')


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
        raw_body = await request.body()
    except Exception:
        return {"status": "ok"}

    sig = request.headers.get('X-Hub-Signature-256', '')
    if APP_SECRET and not verify_webhook_signature(raw_body, sig):
        logger.warning("Webhook HMAC verification failed — rejected")
        return Response(content='', status_code=403)

    try:
        body = await request.json()
    except Exception:
        return {"status": "ok"}

    try:
        payload = WebhookPayload.model_validate(body)
    except Exception as e:
        logger.warning(f"Webhook payload validation failed: {e}")
        return {"status": "ok"}

    try:
        for entry in payload.entry:
            for change in entry.changes:
                value = change.value
                if not value:
                    continue
                pn_id = value.metadata.phone_number_id if value.metadata else ''
                for msg in value.messages:
                    if msg.type == 'text':
                        await handle_incoming_message(msg.from_, msg.text.body if msg.text else '', msg.id, pn_id)
                    elif msg.type == 'reaction':
                        emoji = msg.reaction.emoji if msg.reaction else ''
                        if emoji:
                            await handle_incoming_message(msg.from_, f"reacted with {emoji}", msg.id, pn_id)
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")

    return {"status": "ok"}


def _clean_phone(phone):
    return phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '').replace('whatsapp:', '')

async def handle_incoming_message(phone, message_text, message_id, pn_id=''):
    supabase = get_supabase()
    try:
        phone = _clean_phone(phone)
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
        now_ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
        reply_hour = f"{now_ist.hour:02d}:00"
        supabase.table('customers').update({
            'response_count': response_count,
            'last_contact': datetime.now(timezone.utc).isoformat(),
            'personality_profile': personality,
            'best_contact_time': reply_hour,
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

        today_date = datetime.now(timezone.utc).strftime('%d %b %Y')
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        today_history = supabase.table('conversation_history').select('*').eq(
            'customer_id', customer['id']
        ).gte('timestamp', today_start.isoformat()).order('timestamp').execute()

        extracted = extract_notes_from_conversation(customer, business, today_history.data)
        if extracted:
            day_entry = f"--- {today_date} ---\n{extracted}"
            latest_notes = supabase.table('customers').select('notes').eq('id', customer['id']).execute()
            existing = (latest_notes.data[0].get('notes') or '').strip() if latest_notes.data else ''

            if f'--- {today_date} ---' in existing:
                parts = existing.split(f'--- {today_date} ---')
                before = parts[0]
                after = parts[1].split('---', 1)
                new_notes = before + day_entry + ('\n' + '---' + after[1] if len(after) > 1 else '')
            else:
                new_notes = existing + ('\n\n' if existing else '') + day_entry

            supabase.table('customers').update({'notes': new_notes.strip()}).eq('id', customer['id']).execute()

    except Exception as e:
        logger.error(f"Error handling incoming message: {e}")
