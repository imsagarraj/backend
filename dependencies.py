from fastapi import Depends, HTTPException, Request, status
from database.supabase_client import get_supabase
from supabase import create_client
import os
import logging

logger = logging.getLogger(__name__)


class AuthUser:
    def __init__(self, id: str, email: str | None = None):
        self.id = id
        self.email = email


def get_anon_client():
    return create_client(
        os.getenv('VITE_SUPABASE_URL'),
        os.getenv('VITE_SUPABASE_ANON_KEY')
    )


async def get_current_user(request: Request) -> AuthUser:
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")

    token = auth_header.replace('Bearer ', '')
    try:
        client = get_anon_client()
        user = client.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return AuthUser(id=user.user.id, email=user.user.email)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Auth error — invalid or expired token")
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_admin_user(current_user: AuthUser = Depends(get_current_user)) -> AuthUser:
    supabase = get_supabase()
    result = supabase.table('admin_users').select('*').eq('user_id', current_user.id).execute()
    if not result.data:
        raise HTTPException(status_code=403, detail="Admin access required")

    if not result.data[0].get('is_active', True):
        raise HTTPException(status_code=403, detail="Admin account is deactivated")

    return current_user


async def get_user_business_id(user: AuthUser = Depends(get_current_user)) -> int:
    supabase = get_supabase()
    result = supabase.table('business_profiles').select('id').eq('user_id', user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return result.data[0]['id']
