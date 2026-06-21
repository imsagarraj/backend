from celery_app import celery_app
from database.supabase_client import get_supabase
from services.campaign_service import execute_campaign
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


@celery_app.task
def process_scheduled_campaigns():
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    due = supabase.table('campaigns').select('*').eq(
        'status', 'draft'
    ).eq(
        'schedule_type', 'scheduled'
    ).lte(
        'scheduled_at', now
    ).execute()

    sent = 0
    for campaign in due.data:
        try:
            biz = supabase.table('business_profiles').select('*').eq('id', campaign['business_id']).execute()
            if not biz.data:
                continue
            supabase.table('campaigns').update({
                'status': 'sending',
                'updated_at': now,
            }).eq('id', campaign['id']).execute()
            execute_campaign(campaign, biz.data[0])
            sent += 1
        except Exception as e:
            logger.error(f"Failed to send scheduled campaign {campaign['id']}: {e}")
            supabase.table('campaigns').update({
                'status': 'failed',
                'updated_at': datetime.now(timezone.utc).isoformat(),
            }).eq('id', campaign['id']).execute()

    if sent:
        logger.info(f"Sent {sent} scheduled campaign(s)")
    return {'sent': sent}
