import requests
from dotenv import load_dotenv
from pathlib import Path
import os

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

ACCESS_TOKEN = os.getenv('META_ACCESS_TOKEN')
PHONE_NUMBER_ID = os.getenv('META_PHONE_NUMBER_ID')
API_URL = f'https://graph.facebook.com/v22.0/{PHONE_NUMBER_ID}/messages'

HEADERS = {
    'Authorization': f'Bearer {ACCESS_TOKEN}',
    'Content-Type': 'application/json',
}


def send_text_message(phone, message):
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
        res = requests.post(API_URL, json=payload, headers=HEADERS)
        data = res.json()
        msg_id = data.get('messages', [{}])[0].get('id', '')
        return {"status": "success" if res.ok else "failed", "message_id": msg_id, "response": data}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def send_template_message(phone, template_name, params):
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
        res = requests.post(API_URL, json=payload, headers=HEADERS)
        data = res.json()
        msg_id = data.get('messages', [{}])[0].get('id', '')
        return {"status": "success" if res.ok else "failed", "message_id": msg_id, "response": data}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def mark_message_read(message_id):
    payload = {
        'messaging_product': 'whatsapp',
        'status': 'read',
        'message_id': message_id,
    }
    try:
        requests.post(API_URL, json=payload, headers=HEADERS)
    except Exception:
        pass
