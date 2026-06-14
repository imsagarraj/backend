from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path
import os
import time
import logging
from httpx import ReadError, RemoteProtocolError

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')

SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
ANON_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

_supabase = None


def execute_with_retry(request_builder, max_retries=3, delay=1):
    last_error = None
    for attempt in range(max_retries):
        try:
            return request_builder.execute()
        except (ReadError, RemoteProtocolError) as e:
            last_error = e
            if attempt < max_retries - 1:
                logger.warning(f"DB retry {attempt + 1}/{max_retries}: {e}")
                time.sleep(delay)
    raise last_error


def with_retry(supabase):
    orig_table = supabase.table

    def _wrap_exec(req):
        req.execute = lambda: execute_with_retry(req)
        return req

    def _wrap_method(fn):
        def wrapper(*args, **kwargs):
            return _wrap_exec(fn(*args, **kwargs))
        return wrapper

    def table(name):
        t = orig_table(name)
        for m in ('select', 'insert', 'update', 'delete', 'upsert'):
            if hasattr(t, m):
                setattr(t, m, _wrap_method(getattr(t, m)))
        return t

    supabase.table = table
    return supabase


def get_supabase():
    global _supabase
    if _supabase is None:
        key = SERVICE_KEY or ANON_KEY
        _supabase = with_retry(create_client(SUPABASE_URL, key))
    return _supabase
