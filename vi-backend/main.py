import sentry_sdk
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi import Limiter
from slowapi.util import get_remote_address
from dotenv import load_dotenv
from pathlib import Path
import os, logging

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    enable_tracing=False,
    send_default_pii=True,
    integrations=[
        StarletteIntegration(),
        FastApiIntegration(),
    ],
)

logger = logging.getLogger(__name__)

from database.seed import seed_agents, seed_admin_users
from routers import customers, messages, agents, webhook, analytics, dashboard, admin, business_whatsapp, business_profile, campaigns

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://cloud.vispace.in"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    sentry_sdk.capture_exception(exc)
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={"Access-Control-Allow-Origin": "https://cloud.vispace.in"},
    )

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
app.include_router(campaigns.router, prefix=API_PREFIX, tags=["campaigns"])


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
