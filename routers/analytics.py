from fastapi import APIRouter, Depends, HTTPException
from database.supabase_client import get_supabase
from dependencies import get_current_user, AuthUser
from datetime import datetime, timedelta, timezone
from pydantic import Field
from typing import Annotated
import re

router = APIRouter()

COMPLAINT_KW = [
    'wait', 'waiting', 'wasted', 'late', 'delay',
    'rude', 'staff', 'behaviour', 'behavior', 'argument', 'shout', 'yell',
    'pain', 'hurt', 'bleeding', 'infection', 'swelling', 'uncomfortable',
    'damage', 'broken', 'crack', 'problem', 'issue', 'wrong', 'error',
    'bad', 'terrible', 'worst', 'poor', 'horrible', 'awful',
    'unsatisfied', 'disappointed', 'frustrated', 'annoyed', 'unhappy',
    'expensive', 'costly', 'overcharge', 'refund', 'money back',
    'not good', 'not happy', 'never again', 'won\'t return', 'leaving',
    'dirty', 'unclean', 'hygiene', 'smell',
    'cancelled', 'reschedule', 'no show', 'missed',
    'complicated', 'confusing', 'difficult', 'hard to',
]

PRAISE_KW = [
    'friendly', 'kind', 'caring', 'helpful', 'professional',
    'amazing', 'excellent', 'great', 'good', 'love', 'best',
    'happy', 'wonderful', 'fantastic', 'awesome', 'perfect',
    'superb', 'smooth', 'quick', 'fast', 'comfortable',
    'satisfied', 'recommend', 'thank', 'thanks', 'grateful',
    'clean', 'nice', 'beautiful', 'lovely', 'warm',
    'gentle', 'patient', 'understanding', 'thorough',
    'convenient', 'easy', 'simple', 'efficient',
]

SUGGESTION_PATTERNS = [
    r'(?:you|you\'?a?r?e?)\s+(?:should|could|need to|need|must|can)',
    r'(?:i|we)\s+(?:wish|want|need|would like|hope)',
    r'(?:how about|what about|why not|would be nice if|better if)',
    r'(?:suggest|recommend|improve|consider)\s+(?:adding|offering|providing|having)',
    r'more\s+\w+\s+(?:options|choices|variety)',
    r'(?:add|offer|provide|introduce)\s+(?:more|a|an)',
    r'should\s+(?:have|be|offer|provide|add|include)',
    r'(?:wish|wished)\s+(?:there\s+was|there\s+were|you\s+had|i\s+could)',
]

AT_RISK_KW = [
    'not coming', 'won\'t return', 'leaving', 'switch', 'complain',
    'never again', 'refund', 'cancel', 'not happy', 'disappointed',
    'bad experience', 'unhappy', 'frustrated', 'terrible', 'worst',
    'can\'t take', 'too much', 'done with', 'fed up', 'sick of',
]


def _safe_count(result):
    return result.count if hasattr(result, 'count') and result.count is not None else len(result.data or [])


def _keyword_score(text, keywords):
    if not text:
        return 0
    text_lower = text.lower()
    return sum(1 for kw in keywords if kw in text_lower)


def _extract_snippet(text, keywords, context_words=8):
    """Extract the most relevant sentence/phrase around complaint keywords."""
    if not text:
        return ''
    text_lower = text.lower()
    words = text.split()
    best_idx = -1
    best_kw = ''

    for kw in keywords:
        idx = text_lower.find(kw)
        if idx != -1:
            # Find which word index this falls on
            char_count = 0
            for i, w in enumerate(words):
                char_count += len(w) + 1
                if char_count > idx:
                    best_idx = i
                    best_kw = kw
                    break

    if best_idx == -1:
        return text[:120]

    start = max(0, best_idx - context_words)
    end = min(len(words), best_idx + context_words)
    snippet = ' '.join(words[start:end])
    if start > 0:
        snippet = '...' + snippet
    if end < len(words):
        snippet = snippet + '...'
    return snippet


def _extract_issues_dynamic(all_texts):
    """Extract issues dynamically from actual customer texts.
    
    Returns list of { 'label', 'count', 'example', 'customers' }
    with labels generated from the actual complaint content.
    """
    issue_groups = {}
    customer_issue_map = {}

    for item in all_texts:
        text = item.get('content') or ''
        cid = item.get('customer_id')
        cname = item.get('customer_name', f'Customer #{cid}')
        text_lower = text.lower()

        score = _keyword_score(text, COMPLAINT_KW)
        if score == 0:
            continue

        snippet = _extract_snippet(text, COMPLAINT_KW)
        if not snippet or len(snippet.strip()) < 5:
            continue

        # Determine which keywords matched most strongly
        matched_kws = [kw for kw in COMPLAINT_KW if kw in text_lower]

        # Generate a label based on the matched keywords
        label = _generate_issue_label(matched_kws, text)

        if label not in issue_groups:
            issue_groups[label] = {
                'label': label,
                'count': 0,
                'example': snippet,
                'customers': set(),
                'keywords': set(),
            }

        issue_groups[label]['count'] += 1
        issue_groups[label]['customers'].add(cid)
        issue_groups[label]['keywords'].update(matched_kws)

        # Keep the best example (shortest coherent snippet with most keywords)
        existing = issue_groups[label]['example']
        if len(snippet) < len(existing) or len(matched_kws) > len(issue_groups[label]['keywords']):
            issue_groups[label]['example'] = snippet

    # Sort by count descending, take top 5
    sorted_issues = sorted(issue_groups.values(), key=lambda x: -x['count'])[:5]

    result = []
    for issue in sorted_issues:
        result.append({
            'label': issue['label'],
            'count': issue['count'],
            'example': issue['example'],
            'customer_count': len(issue['customers']),
        })

    return result


def _generate_issue_label(matched_kws, text):
    """Generate a human-readable label for an issue based on what the customer said."""
    text_lower = text.lower()

    # Wait time / delay
    if any(kw in matched_kws for kw in ['wait', 'waiting', 'wasted', 'late', 'delay']):
        if 'hour' in text_lower or 'hr' in text_lower or 'minute' in text_lower or 'time' in text_lower:
            return 'Long Wait Times'
        return 'Waiting / Delays'

    # Staff behaviour
    if any(kw in matched_kws for kw in ['rude', 'staff', 'behaviour', 'behavior', 'argument', 'shout', 'yell']):
        return 'Staff Behaviour'

    # Pain / discomfort (medical/dental specific)
    if any(kw in matched_kws for kw in ['pain', 'hurt', 'bleeding', 'infection', 'swelling', 'uncomfortable']):
        if 'pain' in matched_kws:
            return 'Pain or Discomfort'
        return 'Health Concerns'

    # Quality issues
    if any(kw in matched_kws for kw in ['damage', 'broken', 'crack', 'poor', 'terrible', 'worst', 'bad', 'horrible', 'awful']):
        return 'Poor Quality'

    # Cleanliness
    if any(kw in matched_kws for kw in ['dirty', 'unclean', 'hygiene', 'smell']):
        return 'Cleanliness / Hygiene'

    # Pricing
    if any(kw in matched_kws for kw in ['expensive', 'costly', 'overcharge', 'refund', 'money back']):
        return 'Pricing Concerns'

    # Cancellation / scheduling
    if any(kw in matched_kws for kw in ['cancelled', 'reschedule', 'no show', 'missed']):
        return 'Scheduling Issues'

    # General complaints
    if any(kw in matched_kws for kw in ['problem', 'issue', 'wrong', 'error']):
        return 'Service Problems'

    # Disappointment / churn risk
    if any(kw in matched_kws for kw in ['disappointed', 'frustrated', 'unhappy', 'not happy', 'never again', 'not good']):
        return 'Customer Dissatisfaction'

    # If nothing specific matched, create label from keywords
    if matched_kws:
        return matched_kws[0].capitalize() + ' Related'

    return 'Other Issues'


def _extract_praise_dynamic(all_texts):
    """Extract praised aspects dynamically from customer texts."""
    praise_groups = {}

    for item in all_texts:
        text = item.get('content') or ''
        text_lower = text.lower()

        score = _keyword_score(text, PRAISE_KW)
        if score == 0:
            continue

        matched_kws = [kw for kw in PRAISE_KW if kw in text_lower]
        label = _generate_praise_label(matched_kws, text)

        if label not in praise_groups:
            praise_groups[label] = {'count': 0}

        praise_groups[label]['count'] += 1

    sorted_praise = sorted(praise_groups.items(), key=lambda x: -x[1]['count'])[:4]
    return [item[0] for item in sorted_praise]


def _generate_praise_label(matched_kws, text):
    text_lower = text.lower()

    if any(kw in matched_kws for kw in ['friendly', 'kind', 'caring', 'helpful', 'professional', 'gentle', 'patient', 'understanding']):
        return 'Friendly Staff'
    if any(kw in matched_kws for kw in ['great', 'excellent', 'amazing', 'perfect', 'superb', 'fantastic', 'awesome', 'wonderful', 'lovely']):
        return 'Excellent Quality'
    if any(kw in matched_kws for kw in ['quick', 'fast', 'smooth', 'efficient', 'convenient', 'easy']):
        return 'Fast Service'
    if any(kw in matched_kws for kw in ['clean', 'nice', 'beautiful', 'warm', 'comfortable']):
        return 'Clean & Comfortable'
    if any(kw in matched_kws for kw in ['satisfied', 'happy', 'love', 'best']):
        return 'Great Experience'
    if any(kw in matched_kws for kw in ['recommend', 'thank', 'thanks', 'grateful']):
        return 'Would Recommend'
    if matched_kws:
        return matched_kws[0].capitalize()
    return 'Other'


def _extract_suggestions_dynamic(all_texts):
    """Extract suggestions from customer texts using regex patterns."""
    suggestions = {}

    for item in all_texts:
        text = item.get('content') or ''
        if not text.strip():
            continue

        text_lower = text.lower()

        for pattern in SUGGESTION_PATTERNS:
            if re.search(pattern, text_lower):
                # Extract the main subject of the suggestion
                snippet = _extract_suggestion_topic(text)
                if snippet:
                    suggestions[snippet] = suggestions.get(snippet, 0) + 1
                break

    sorted_suggestions = sorted(suggestions.items(), key=lambda x: -x[1])[:3]
    return [s[0] for s in sorted_suggestions]


def _extract_suggestion_topic(text):
    """Extract the key topic from a suggestion sentence."""
    text_lower = text.lower()

    topics = [
        (['payment', 'credit', 'debit', 'card', 'cash', 'upi', 'online'], 'More Payment Options'),
        (['loyalty', 'reward', 'points', 'discount', 'offer', 'coupon'], 'Loyalty Program'),
        (['weekend', 'sunday', 'saturday', 'holiday', 'evening', 'after hours'], 'Weekend / Extended Hours'),
        (['appointment', 'booking', 'schedule', 'slot', 'availability'], 'Easier Booking'),
        (['home', 'delivery', 'doorstep', 'online', 'website', 'app'], 'Online Services'),
        (['parking', 'location', 'reach', 'access', 'transport'], 'Better Location / Parking'),
        (['wait', 'waiting', 'queue', 'line', 'faster', 'speed'], 'Reduce Waiting Time'),
        (['more', 'variety', 'choice', 'range', 'selection'], 'More Options'),
        (['inform', 'remind', 'reminder', 'notification', 'update'], 'Better Communication'),
    ]

    for keywords, label in topics:
        if any(kw in text_lower for kw in keywords):
            return label

    # If no topic matched, extract the first sentence
    sentences = text.split('.')
    for s in sentences:
        s = s.strip()
        if len(s) > 10 and _keyword_score(s, SUGGESTION_PATTERNS[0].split('|')[0].split('\\s')[0]):
            return s[:60] + ('...' if len(s) > 60 else '')
    return 'General Suggestion'


def _get_customers_at_risk(customers, messages, conv_history):
    """Identify customers at risk."""
    at_risk_count = 0
    at_risk_customers = []

    for c in (customers.data or []):
        cid = c['id']
        notes = (c.get('notes') or '').lower()
        reasons = []

        risk_score = _keyword_score(notes, AT_RISK_KW)
        if risk_score > 0:
            reasons.append('negative feedback')

        for msg in (conv_history.data or []) + (messages.data or []):
            if msg.get('customer_id') != cid:
                continue
            if _keyword_score(msg.get('content') or '', AT_RISK_KW) > 0:
                if 'expressed dissatisfaction' not in reasons:
                    reasons.append('expressed dissatisfaction')
                break

        visit_count = c.get('visit_count') or 0
        if visit_count <= 1 and c.get('last_contact'):
            reasons.append('no return visit')

        if any(kw in notes for kw in ['complaint', 'issue', 'problem', 'unhappy', 'wait']):
            if 'resolved' not in notes and 'resolved' not in reasons:
                reasons.append('unresolved complaint')

        if reasons:
            at_risk_count += 1
            at_risk_customers.append({
                'id': cid,
                'name': c.get('name'),
                'reasons': reasons,
            })

    return at_risk_count, at_risk_customers


@router.get("/analytics")
def get_analytics(period: Annotated[str, Field(pattern=r'^(7d|30d|90d)$')] = "30d", user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    biz = supabase.table('business_profiles').select('id').eq('user_id', user.id).execute()
    if not biz.data:
        raise HTTPException(status_code=404, detail="Business profile not found")
    business_id = biz.data[0]['id']

    days_map = {"7d": 7, "30d": 30, "90d": 90}
    num_days = days_map[period]
    cutoff = (datetime.now(timezone.utc) - timedelta(days=num_days)).isoformat()

    total = supabase.table('customers').select('*', count='exact').eq(
        'business_id', business_id
    ).execute()

    sent = supabase.table('messages').select('customer_id', count='exact').eq(
        'business_id', business_id
    ).eq('direction', 'sent').gte('timestamp', cutoff).execute()

    received = supabase.table('messages').select('customer_id', count='exact').eq(
        'business_id', business_id
    ).eq('direction', 'received').gte('timestamp', cutoff).execute()

    sent_count = sent.count if hasattr(sent, 'count') else len(sent.data)
    recv_count = received.count if hasattr(received, 'count') else len(received.data)

    sent_customers = len(set(m['customer_id'] for m in (sent.data or [])))
    recv_customers = len(set(m['customer_id'] for m in (received.data or [])))
    response_rate = round((recv_customers / sent_customers * 100), 1) if sent_customers > 0 else 0

    all_msgs = supabase.table('messages').select('timestamp,direction').eq(
        'business_id', business_id
    ).gte('timestamp', cutoff).order('timestamp').limit(10000).execute()

    messages_per_day = {}
    for m in (all_msgs.data or []):
        day = m['timestamp'][:10] if m.get('timestamp') else 'unknown'
        if day not in messages_per_day:
            messages_per_day[day] = {"date": day, "sent": 0, "received": 0}
        messages_per_day[day][m['direction']] += 1

    return {
        "total_customers": total.count if hasattr(total, 'count') else len(total.data),
        "messages_sent": sent_count,
        "messages_received": recv_count,
        "responding_customers": recv_customers,
        "messaged_customers": sent_customers,
        "response_rate": response_rate,
        "messages_per_day": sorted(messages_per_day.values(), key=lambda x: x["date"])
    }


@router.get("/insights")
def get_insights(user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    biz = supabase.table('business_profiles').select('id').eq('user_id', user.id).execute()
    if not biz.data:
        raise HTTPException(status_code=404, detail="Business profile not found")
    business_id = biz.data[0]['id']

    cutoff_30d = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    # --- Fetch data ---
    customers = supabase.table('customers').select('*').eq('business_id', business_id).execute()
    total_count = _safe_count(customers)

    recent_messages = supabase.table('messages').select('*').eq(
        'business_id', business_id
    ).gte('timestamp', cutoff_30d).execute()

    # Get only conversation history for this business's customers
    biz_customer_ids = [c['id'] for c in (customers.data or [])]
    if biz_customer_ids:
        conv_history = supabase.table('conversation_history').select('*').in_(
            'customer_id', biz_customer_ids
        ).execute()
    else:
        conv_history = supabase.table('conversation_history').select('*').limit(0).execute()

    sent_msgs = [m for m in (recent_messages.data or []) if m.get('direction') == 'sent']
    recv_msgs = [m for m in (recent_messages.data or []) if m.get('direction') == 'received']

    sent_customers = len(set(m['customer_id'] for m in sent_msgs))
    recv_customers = len(set(m['customer_id'] for m in recv_msgs))
    response_rate = round((recv_customers / sent_customers * 100)) if sent_customers > 0 else 0

    # --- Build customer name map ---
    cust_name_map = {}
    for c in (customers.data or []):
        cust_name_map[c['id']] = c.get('name', f'Customer #{c["id"]}')

    # --- Collect all customer texts for analysis ---
    # We want: received messages (customer wrote these), conversation_history with role='user', and notes
    all_customer_texts = []

    for m in (recv_msgs or []):
        cid = m.get('customer_id')
        all_customer_texts.append({
            'content': m.get('content') or '',
            'customer_id': cid,
            'customer_name': cust_name_map.get(cid, f'Customer #{cid}'),
        })

    for ch in (conv_history.data or []):
        if ch.get('role') != 'user':
            continue
        cid = ch.get('customer_id')
        all_customer_texts.append({
            'content': ch.get('content') or '',
            'customer_id': cid,
            'customer_name': cust_name_map.get(cid, f'Customer #{cid}'),
        })

    # Also add notes as text sources
    for c in (customers.data or []):
        notes = c.get('notes') or ''
        if notes.strip():
            all_customer_texts.append({
                'content': notes,
                'customer_id': c['id'],
                'customer_name': c.get('name', f'Customer #{c["id"]}'),
            })

    # --- Health Metrics ---
    returning_count = sum(1 for c in (customers.data or []) if (c.get('visit_count') or 0) > 1)
    reviews_count = sum(1 for c in (customers.data or []) if c.get('notes'))

    at_risk_count, at_risk_customers = _get_customers_at_risk(customers, recent_messages, conv_history)

    # Customer satisfaction: blend of response rate and positive sentiment
    positive_signal = 0
    total_signal = 0
    for c in (customers.data or []):
        notes = c.get('notes') or ''
        total_signal += 1
        if _keyword_score(notes, PRAISE_KW) > _keyword_score(notes, COMPLAINT_KW):
            positive_signal += 1
    for m in (recv_msgs or []):
        content = m.get('content') or ''
        total_signal += 1
        if _keyword_score(content, PRAISE_KW) > _keyword_score(content, COMPLAINT_KW):
            positive_signal += 1

    if total_signal > 0:
        satisfaction = min(round(positive_signal / total_signal * 100), 100)
    else:
        satisfaction = response_rate if response_rate > 0 else 0

    # --- Top Issues - Dynamically extracted from customer texts ---
    issues_data = _extract_issues_dynamic(all_customer_texts)

    issues_list = []
    icons = ['❗', '🚨', '⚠️', '🔴', '🟠']
    for i, issue in enumerate(issues_data[:3]):
        icon = icons[i] if i < len(icons) else '❗'
        issues_list.append({
            'icon': icon,
            'label': issue['label'],
            'count': issue['count'],
            'example': issue['example'],
            'customer_count': issue['customer_count'],
        })

    # --- Customers At Risk Detail ---
    not_returned = sum(1 for c in at_risk_customers if 'no return visit' in c.get('reasons', []))
    negative_feedback = sum(1 for c in at_risk_customers if 'negative feedback' in c.get('reasons', []))

    # --- Appreciate - Dynamically extracted ---
    appreciate_list = _extract_praise_dynamic(all_customer_texts)

    # --- Suggestions - Dynamically extracted ---
    suggestions_list = _extract_suggestions_dynamic(all_customer_texts)

    # --- Feedback breakdown ---
    # Complaints: use the extracted issues as complaints
    complaints_list = [{'label': i['label'], 'count': i['count']} for i in issues_data[:3]]

    # Praise: use the appreciate list
    praise_list = appreciate_list[:3]

    # --- Unreturned after negative feedback ---
    unreturned_after_negative = sum(
        1 for c in (customers.data or [])
        if _keyword_score(c.get('notes') or '', COMPLAINT_KW) > 0
        and (c.get('visit_count') or 1) <= 1
    )

    # --- Build response ---
    return {
        'health': {
            'customer_satisfaction': satisfaction,
            'returning_customers_pct': round(returning_count / total_count * 100) if total_count > 0 else 0,
            'reviews_collected': reviews_count,
            'customers_at_risk': at_risk_count,
            'not_returned_after_negative': unreturned_after_negative,
        },
        'top_issues': issues_list,
        'appreciate': appreciate_list if appreciate_list else ['Friendly Staff', 'Good Service', 'Clean Environment'],
        'feedback': {
            'complaints': complaints_list if complaints_list else [],
            'suggestions': suggestions_list if suggestions_list else [],
            'praise': praise_list if praise_list else [],
        },
        'at_risk_customers': at_risk_customers[:10],
    }
