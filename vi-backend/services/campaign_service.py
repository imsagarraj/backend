from database.supabase_client import get_supabase
from services.whatsapp_service import send_text_message
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)


def execute_campaign(campaign, business):
    supabase = get_supabase()
    biz_id = campaign['business_id']
    pn_id = business.get('meta_phone_number_id')
    if not pn_id:
        logger.error(f"No WhatsApp number for campaign {campaign['id']}")
        return

    query = supabase.table('customers').select('*').eq('business_id', biz_id)
    at = campaign.get('audience_type', 'all')
    af = campaign.get('audience_filter')

    if at == 'inactive':
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        query = query.lt('last_contact', thirty_days_ago)
    elif at == 'product' and af and af.get('product'):
        query = query.eq('product', af['product'])
    elif at == 'custom' and af:
        if af.get('city'):
            query = query.eq('city', af['city'])
        if af.get('status'):
            query = query.eq('status', af['status'])
        if af.get('gender'):
            query = query.eq('gender', af['gender'])

    target_customers = query.execute().data
    sent_count = 0
    failed_list = []

    for customer in target_customers:
        if not customer.get('phone'):
            continue
        try:
            result = send_text_message(customer['phone'], campaign['message'], phone_number_id=pn_id)
            if result.get('status') == 'success':
                supabase.table('messages').insert({
                    'customer_id': customer['id'],
                    'business_id': biz_id,
                    'direction': 'sent',
                    'content': campaign['message'],
                    'status': 'sent',
                    'meta_message_id': result.get('message_id'),
                    'campaign_id': campaign['id'],
                }).execute()
                sent_count += 1
            else:
                failed_list.append({"customer_id": customer['id'], "phone": customer['phone'], "error": result.get('error', 'Send failed')})
        except Exception as e:
            failed_list.append({"customer_id": customer['id'], "phone": customer['phone'], "error": str(e)[:100]})

    supabase.table('campaigns').update({
        'status': 'sent' if sent_count > 0 else 'failed',
        'messages_sent': sent_count,
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }).eq('id', campaign['id']).execute()

    logger.info(f"Campaign {campaign['id']}: sent {sent_count}, failed {len(failed_list)}")
