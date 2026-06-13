from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi import Limiter
from slowapi.util import get_remote_address
from dotenv import load_dotenv
from pathlib import Path
import os

from middleware import ForceCORSMiddleware
from database.seed import seed_agents, seed_admin_users
from routers import customers, messages, agents, webhook, analytics, dashboard, admin, business_whatsapp, business_profile

env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(env_path)

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(
    title="Vi Platform Backend",
    description="AI-powered after-sales customer relationship platform",
    version="2.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(ForceCORSMiddleware)

API_PREFIX = "/api/v1"


@app.api_route("/{path:path}", methods=["OPTIONS"])
async def preflight(path: str):
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(content="", status_code=200)


app.include_router(webhook.router, prefix=API_PREFIX, tags=["webhook"])
app.include_router(customers.router, prefix=API_PREFIX, tags=["customers"])
app.include_router(messages.router, prefix=API_PREFIX, tags=["messages"])
app.include_router(agents.router, prefix=API_PREFIX, tags=["agents"])
app.include_router(analytics.router, prefix=API_PREFIX, tags=["analytics"])
app.include_router(dashboard.router, prefix=API_PREFIX, tags=["dashboard"])
app.include_router(admin.router, prefix=API_PREFIX, tags=["admin"])
app.include_router(business_whatsapp.router, prefix=API_PREFIX, tags=["business_whatsapp"])
app.include_router(business_profile.router, prefix=API_PREFIX, tags=["business_profile"])


@app.on_event("startup")
def on_startup():
    try:
        seed_agents()
    except Exception as e:
        print(f"Seed agents warning (non-fatal): {e}")
    try:
        seed_admin_users()
    except Exception as e:
        print(f"Seed admin users warning (non-fatal): {e}")
    try:
        from database.supabase_client import get_supabase
        supabase = get_supabase()
        biz = supabase.table('business_profiles').select('id').limit(1).execute()
        if biz.data:
            supabase.table('customers').update({'business_id': biz.data[0]['id']}).is_('business_id', 'null').execute()
    except Exception as e:
        print(f"Fix orphan customers warning (non-fatal): {e}")


@app.get("/")
def root():
    return {"message": "Vi Platform Backend v2.0", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
