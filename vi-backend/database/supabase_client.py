from supabase import create_client
from supabase.lib.client_options import SyncClientOptions
from dotenv import load_dotenv
from pathlib import Path
import os
import httpx

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')

SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
ANON_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

_supabase = None


def get_supabase():
    global _supabase
    if _supabase is None:
        key = SERVICE_KEY or ANON_KEY
        http_client = httpx.Client(
            http2=False,
            timeout=httpx.Timeout(30.0, connect=10.0),
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
        )
        options = SyncClientOptions(httpx_client=http_client)
        _supabase = create_client(SUPABASE_URL, key, options=options)
    return _supabase
