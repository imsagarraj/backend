import requests
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)


def fetch_phone_number_id(waba_id, phone_number):
    token = os.getenv('META_ACCESS_TOKEN')
    if not token or not waba_id:
        return None

    url = f'https://graph.facebook.com/v22.0/{waba_id}/phone_numbers'
    headers = {'Authorization': f'Bearer {token}'}

    clean = phone_number.replace('+', '').replace(' ', '').replace('-', '')

    try:
        res = requests.get(url, headers=headers)
        data = res.json()
        for pn in data.get('data', []):
            pn_clean = pn.get('display_phone_number', '').replace('+', '').replace(' ', '').replace('-', '')
            if pn_clean == clean or pn_clean.endswith(clean):
                return pn['id']
        return None
    except Exception:
        return None
