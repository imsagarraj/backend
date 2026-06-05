import requests
from dotenv import load_dotenv
from pathlib import Path
import os

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

ACCESS_TOKEN = os.getenv('META_ACCESS_TOKEN')
FALLBACK_PHONE_NUMBER_ID = os.getenv('META_PHONE_NUMBER_ID')


def _get_headers():
    return {
        'Authorization': f'Bearer {ACCESS_TOKEN}',
        'Content-Type': 'application/json',
    }


def _get_api_url(phone_number_id=None):
    pid = phone_number_id or FALLBACK_PHONE_NUMBER_ID
    return f'https://graph.facebook.com/v22.0/{pid}/messages'


def send_text_message(phone, message, phone_number_id=None):
    if phone.startswith('whatsapp:'):
        phone = phone.replace('whatsapp:', '')
    to = phone.lstrip('+')

    payload = {
        'messaging_product': 'whatsapp',
        'recipient_type': 'individual',
        'to': to,
        'type': 'text',
        'text': {'preview_url': False, 'body': message},
    }

    try:
        res = requests.post(_get_api_url(phone_number_id), json=payload, headers=_get_headers())
        data = res.json()
        msg_id = data.get('messages', [{}])[0].get('id', '')
        return {"status": "success" if res.ok else "failed", "message_id": msg_id, "response": data}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def send_template_message(phone, template_name, params, phone_number_id=None):
    if phone.startswith('whatsapp:'):
        phone = phone.replace('whatsapp:', '')
    to = phone.lstrip('+')

    components = [{
        'type': 'body',
        'parameters': [{'type': 'text', 'text': p} for p in params],
    }]

    payload = {
        'messaging_product': 'whatsapp',
        'recipient_type': 'individual',
        'to': to,
        'type': 'template',
        'template': {
            'name': template_name,
            'language': {'code': 'en'},
            'components': components,
        },
    }

    try:
        res = requests.post(_get_api_url(phone_number_id), json=payload, headers=_get_headers())
        data = res.json()
        msg_id = data.get('messages', [{}])[0].get('id', '')
        return {"status": "success" if res.ok else "failed", "message_id": msg_id, "response": data}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def mark_message_read(message_id, phone_number_id=None):
    payload = {
        'messaging_product': 'whatsapp',
        'status': 'read',
        'message_id': message_id,
    }
    try:
        requests.post(_get_api_url(phone_number_id), json=payload, headers=_get_headers())
    except Exception:
        pass
