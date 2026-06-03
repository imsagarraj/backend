from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path
import os

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')

# Use service_role key for backend operations (bypasses RLS)
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
# Fall back to anon key if service key not set
ANON_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

_supabase = None


def get_supabase():
    global _supabase
    if _supabase is None:
        key = SERVICE_KEY or ANON_KEY
        _supabase = create_client(SUPABASE_URL, key)
    return _supabase
