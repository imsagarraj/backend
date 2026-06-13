from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from dotenv import load_dotenv
from pathlib import Path
import os, logging

logger = logging.getLogger(__name__)

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

ALLOWED_ORIGINS_ENV = os.getenv('ALLOWED_ORIGINS', '')
origins = ["*"]
if ALLOWED_ORIGINS_ENV:
    origins = [o.strip() for o in ALLOWED_ORIGINS_ENV.split(',') if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SlowAPIMiddleware)

API_PREFIX = "/api/v1"

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
        logger.warning(f"Seed agents (non-fatal): {e}")
    try:
        seed_admin_users()
    except Exception as e:
        logger.warning(f"Seed admin users (non-fatal): {e}")


@app.get("/")
def root():
    return {"message": "Vi Platform Backend v2.0", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
