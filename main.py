import sentry_sdk
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration
from fastapi import FastAPI
from fastapi.responses import JSONResponse, PlainTextResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
from pathlib import Path
import os, logging

from rate_limit import limiter

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    enable_tracing=False,
    send_default_pii=False,
    integrations=[
        StarletteIntegration(),
        FastApiIntegration(),
    ],
)

logger = logging.getLogger(__name__)

from database.seed import seed_agents, seed_admin_users
from routers import customers, messages, agents, webhook, analytics, dashboard, admin, business_whatsapp, business_profile, campaigns, notifications

env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(env_path)

app = FastAPI(
    title="Vi Platform Backend",
    description="AI-powered after-sales customer relationship platform",
    version="2.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


MAX_BODY_SIZE = 10 * 1024 * 1024


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get('content-length')
        if content_length and content_length.isdigit():
            if int(content_length) > MAX_BODY_SIZE:
                return PlainTextResponse('Request body too large', status_code=413)
        response: Response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        return response


app.add_middleware(SecurityHeadersMiddleware)

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
app.include_router(notifications.router, prefix=API_PREFIX, tags=["notifications"])


def _run_migration():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        logger.warning("DATABASE_URL not set — skipping auto-migration. Run manually: see supabase-migration.sql")
        return
    try:
        import psycopg2
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("ALTER TABLE customers ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 1")
        cur.execute("ALTER TABLE customers ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ")
        conn.commit()
        cur.close()
        conn.close()
        logger.info("✅ Migration: added visit_count and returned_at columns")
    except Exception as e:
        logger.warning(f"Auto-migration failed (non-fatal): {e}")


@app.on_event("startup")
def on_startup():
    try:
        _run_migration()
    except Exception as e:
        logger.warning(f"Migration error (non-fatal): {e}")
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
