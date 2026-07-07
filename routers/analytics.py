from fastapi import APIRouter, Depends, HTTPException
from database.supabase_client import get_supabase
from dependencies import get_current_user, AuthUser
from datetime import datetime, timedelta, timezone
from pydantic import Field
from typing import Annotated

router = APIRouter()

COMPLAINT_KW = [
    'damage', 'broken', 'crack', 'leak', 'late', 'delay', 'wait', 'waiting',
    'wasted', 'rude', 'staff', 'behaviour', 'behavior', 'argument', 'shout',
    'problem', 'issue', 'wrong', 'bad', 'terrible', 'worst', 'poor',
    'unsatisfied', 'disappointed', 'frustrated', 'annoyed', 'expensive',
    'overcharge', 'wrong item', 'missing', 'not good', 'not happy',
]
PRAISE_KW = [
    'friendly', 'amazing', 'excellent', 'great', 'good', 'love', 'best',
    'happy', 'wonderful', 'fantastic', 'awesome', 'perfect', 'kind',
    'helpful', 'caring', 'professional', 'smooth', 'quick', 'fast',
    'comfortable', 'satisfied', 'recommend', 'thank', 'superb',
]
SUGGESTION_KW = [
    'should', 'wish', 'need', 'want', 'suggest', 'recommend', 'improve',
    'add', 'offer', 'provide', 'introduce', 'option', 'payment',
    'discount', 'offer', 'loyalty', 'weekend', 'timing', 'availability',
    'more', 'better if', 'can you', 'could you', 'would be nice',
]
AT_RISK_KW = [
    'not coming', 'won\'t return', 'leaving', 'switch', 'complain',
    'never again', 'refund', 'cancel', 'not happy', 'disappointed',
    'bad experience', 'unhappy', 'frustrated',
]


def _safe_count(result):
    return result.count if hasattr(result, 'count') and result.count is not None else len(result.data or [])


def _keyword_score(text, keywords):
    if not text:
        return 0
    text_lower = text.lower()
    return sum(1 for kw in keywords if kw in text_lower)


def _extract_issues(messages, conv_history, customers):
    """Extract top issues from conversation data."""
    issues = {}

    for msg in (conv_history.data or []) + (messages.data or []):
        content = msg.get('content') or ''
        text_lower = content.lower()

        # Packaging damage
        if any(kw in text_lower for kw in ['packaging', 'package', 'packing', 'damage', 'broken', 'crack']):
            issues['packaging'] = issues.get('packaging', 0) + 1

        # Late delivery
        if any(kw in text_lower for kw in ['late', 'delay', 'wait', 'waiting', 'delivery']):
            issues['delivery'] = issues.get('delivery', 0) + 1

        # Staff behaviour
        if any(kw in text_lower for kw in ['staff', 'rude', 'behaviour', 'behavior', 'argument', 'shout']):
            issues['staff'] = issues.get('staff', 0) + 1

        # Price
        if any(kw in text_lower for kw in ['expensive', 'cost', 'price', 'overcharge', 'money']):
            issues['pricing'] = issues.get('pricing', 0) + 1

        # Quality
        if any(kw in text_lower for kw in ['quality', 'product', 'poor', 'bad', 'worst']):
            issues['quality'] = issues.get('quality', 0) + 1

    # Also check customer notes
    for c in (customers.data or []):
        notes = (c.get('notes') or '').lower()
        if not notes:
            continue
        if any(kw in notes for kw in ['damage', 'broken', 'packaging', 'package']):
            issues['packaging'] = issues.get('packaging', 0) + 1
        if any(kw in notes for kw in ['wait', 'delay', 'late']):
            issues['delivery'] = issues.get('delivery', 0) + 1
        if any(kw in notes for kw in ['staff', 'rude', 'behaviour']):
            issues['staff'] = issues.get('staff', 0) + 1

    return issues


def _extract_feedback(messages, conv_history):
    """Categorize feedback into complaints, suggestions, praise."""
    seen = set()
    complaints = {}
    suggestions = {}
    praise_items = {}

    for msg in (conv_history.data or []) + (messages.data or []):
        content = msg.get('content') or ''
        if not content.strip():
            continue

        text_lower = content.lower()
        key = content.strip()[:80]

        # Avoid counting the same message twice
        if key in seen:
            continue
        seen.add(key)

        complaint_score = _keyword_score(content, COMPLAINT_KW)
        praise_score = _keyword_score(content, PRAISE_KW)
        suggestion_score = _keyword_score(content, SUGGESTION_KW)

        # Determine dominant category
        if complaint_score > praise_score and complaint_score > suggestion_score:
            for kw in COMPLAINT_KW:
                if kw in text_lower:
                    label = _categorize_complaint(kw)
                    complaints[label] = complaints.get(label, 0) + 1
                    break

        if praise_score > complaint_score and praise_score >= suggestion_score:
            for kw in PRAISE_KW:
                if kw in text_lower:
                    label = _categorize_praise(kw)
                    praise_items[label] = praise_items.get(label, 0) + 1
                    break

        if suggestion_score > complaint_score and suggestion_score >= praise_score:
            for kw in SUGGESTION_KW:
                if kw in text_lower:
                    label = _categorize_suggestion(kw)
                    suggestions[label] = suggestions.get(label, 0) + 1
                    break

    # Sort by frequency
    complaints_sorted = sorted(complaints.items(), key=lambda x: -x[1])[:3]
    suggestions_sorted = sorted(suggestions.items(), key=lambda x: -x[1])[:3]
    praise_sorted = sorted(praise_items.items(), key=lambda x: -x[1])[:3]

    return {
        'complaints': [{'label': k, 'count': v} for k, v in complaints_sorted],
        'suggestions': [{'label': k} for k, v in suggestions_sorted],
        'praise': [{'label': k} for k, v in praise_sorted],
    }


def _categorize_complaint(kw):
    mapping = {
        'damage': 'Packaging Damage',
        'broken': 'Packaging Damage',
        'crack': 'Packaging Damage',
        'leak': 'Packaging Damage',
        'packaging': 'Packaging Damage',
        'package': 'Packaging Damage',
        'packing': 'Packaging Damage',
        'late': 'Late Delivery',
        'delay': 'Late Delivery',
        'delivery': 'Late Delivery',
        'wait': 'Long Wait Time',
        'waiting': 'Long Wait Time',
        'wasted': 'Long Wait Time',
        'rude': 'Staff Behaviour',
        'staff': 'Staff Behaviour',
        'behaviour': 'Staff Behaviour',
        'behavior': 'Staff Behaviour',
        'argument': 'Staff Behaviour',
        'shout': 'Staff Behaviour',
        'expensive': 'Pricing',
        'overcharge': 'Pricing',
        'problem': 'Service Issue',
        'issue': 'Service Issue',
        'wrong': 'Service Issue',
    }
    return mapping.get(kw, 'Other Complaint')


def _categorize_praise(kw):
    mapping = {
        'friendly': 'Friendly Staff',
        'kind': 'Friendly Staff',
        'caring': 'Friendly Staff',
        'helpful': 'Friendly Staff',
        'great': 'Excellent Quality',
        'excellent': 'Excellent Quality',
        'amazing': 'Excellent Quality',
        'wonderful': 'Excellent Quality',
        'fantastic': 'Excellent Quality',
        'awesome': 'Excellent Quality',
        'superb': 'Excellent Quality',
        'perfect': 'Excellent Quality',
        'good': 'Good Service',
        'love': 'Great Experience',
        'best': 'Great Experience',
        'happy': 'Great Experience',
        'satisfied': 'Great Experience',
        'comfortable': 'Good Service',
        'professional': 'Friendly Staff',
        'smooth': 'Smooth Delivery',
        'quick': 'Fast Service',
        'fast': 'Fast Service',
        'recommend': 'Would Recommend',
        'thank': 'Appreciation',
    }
    return mapping.get(kw, 'Other Praise')


def _categorize_suggestion(kw):
    mapping = {
        'payment': 'More Payment Options',
        'option': 'More Payment Options',
        'discount': 'Loyalty Program',
        'loyalty': 'Loyalty Program',
        'offer': 'Better Offers',
        'weekend': 'Weekend Availability',
        'timing': 'Extended Hours',
        'availability': 'Extended Hours',
        'add': 'New Features',
        'introduce': 'New Features',
        'improve': 'Improvements',
        'can you': 'Service Request',
        'could you': 'Service Request',
        'would be nice': 'Feature Request',
    }
    return mapping.get(kw, 'Other Suggestion')


def _get_customers_at_risk(customers, messages, conv_history):
    """Identify customers at risk."""
    at_risk_count = 0
    at_risk_customers = []

    for c in (customers.data or []):
        cid = c['id']
        notes = (c.get('notes') or '').lower()
        reasons = []

        # Check notes for risk keywords
        risk_score = _keyword_score(notes, AT_RISK_KW)
        if risk_score > 0:
            reasons.append('negative feedback')

        # Check messages from this customer
        for msg in (conv_history.data or []) + (messages.data or []):
            if msg.get('customer_id') != cid:
                continue
            if _keyword_score(msg.get('content') or '', AT_RISK_KW) > 0:
                reasons.append('expressed dissatisfaction')
                break

        # Check if customer hasn't returned (visit_count <= 1 and has been contacted)
        visit_count = c.get('visit_count') or 0
        if visit_count <= 1 and c.get('last_contact'):
            reasons.append('no return visit')

        # Check for unresolved complaints in notes
        if any(kw in notes for kw in ['complaint', 'issue', 'problem', 'unhappy']):
            if 'resolved' not in notes:
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
    cutoff_7d = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    # --- Fetch data ---
    customers = supabase.table('customers').select('*').eq('business_id', business_id).execute()
    total_count = _safe_count(customers)

    recent_messages = supabase.table('messages').select('*').eq('business_id', business_id).gte('timestamp', cutoff_30d).execute()
    conv_history = supabase.table('conversation_history').select('*').execute()

    sent_msgs = [m for m in (recent_messages.data or []) if m.get('direction') == 'sent']
    recv_msgs = [m for m in (recent_messages.data or []) if m.get('direction') == 'received']

    sent_customers = len(set(m['customer_id'] for m in sent_msgs))
    recv_customers = len(set(m['customer_id'] for m in recv_msgs))
    response_rate = round((recv_customers / sent_customers * 100)) if sent_customers > 0 else 0

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

    # --- Top Issues ---
    issues = _extract_issues(recent_messages, conv_history, customers)
    total_issues = sum(issues.values())
    issues_list = []

    issue_config = [
        ('packaging', '📦', 'Packaging complaints increased by {}%.', 'Compared to last month, more customers are reporting damaged packaging on delivery.'),
        ('delivery', '🚚', '{} customers reported delayed delivery during the last 30 days.', 'Delivery delays are a common complaint affecting customer satisfaction.'),
        ('staff', '👤', '{} customers mentioned staff behaviour concerns.', 'Customer service interactions need attention to prevent churn.'),
        ('pricing', '💰', '{} customers raised pricing concerns.', 'Customers are sensitive to pricing — consider reviewing your rates.'),
        ('quality', '📋', '{} customers reported quality issues.', 'Product or service quality needs improvement based on feedback.'),
    ]

    for key, icon, title_tmpl, desc in issue_config:
        count = issues.get(key, 0)
        if count > 0:
            if key == 'packaging' and total_issues > 0:
                pct = round(count / total_issues * 100)
                issues_list.append({
                    'icon': icon,
                    'title': title_tmpl.format(pct),
                    'desc': desc,
                })
            else:
                issues_list.append({
                    'icon': icon,
                    'title': title_tmpl.format(count),
                    'desc': desc,
                })

    # If no issues found from data, don't return fabricated ones
    if not issues_list:
        issues_list = []

    # --- Customers At Risk Detail ---
    not_returned = sum(1 for c in at_risk_customers if 'no return visit' in c.get('reasons', []))
    negative_feedback = sum(1 for c in at_risk_customers if 'negative feedback' in c.get('reasons', []) or 'unresolved complaint' in c.get('reasons', []))

    # --- Appreciate ---
    appreciate_counts = {}
    for msg in (recv_msgs or []) + (conv_history.data or []):
        content = msg.get('content') or ''
        for kw in PRAISE_KW:
            if kw in content.lower():
                for cat_kw in ['friendly', 'kind', 'caring', 'helpful', 'professional']:
                    if cat_kw in content.lower():
                        appreciate_counts['Friendly Staff'] = appreciate_counts.get('Friendly Staff', 0) + 1
                        break
                for cat_kw in ['great', 'excellent', 'amazing', 'perfect', 'superb', 'awesome', 'fantastic', 'wonderful']:
                    if cat_kw in content.lower():
                        appreciate_counts['Excellent Quality'] = appreciate_counts.get('Excellent Quality', 0) + 1
                        break
                for cat_kw in ['quick', 'fast']:
                    if cat_kw in content.lower():
                        appreciate_counts['Fast Service'] = appreciate_counts.get('Fast Service', 0) + 1
                        break
                for cat_kw in ['smooth']:
                    if cat_kw in content.lower():
                        appreciate_counts['Smooth Delivery'] = appreciate_counts.get('Smooth Delivery', 0) + 1
                        break

    # Fallback: if customer notes mention positive things
    for c in (customers.data or []):
        notes = (c.get('notes') or '').lower()
        if 'friendly' in notes or 'kind' in notes:
            appreciate_counts['Friendly Staff'] = appreciate_counts.get('Friendly Staff', 0) + 1
        if 'quality' in notes or 'great' in notes or 'excellent' in notes:
            appreciate_counts['Excellent Quality'] = appreciate_counts.get('Excellent Quality', 0) + 1
        if 'fast' in notes:
            appreciate_counts['Fast Service'] = appreciate_counts.get('Fast Service', 0) + 1
        if 'delivery' in notes and ('good' in notes or 'smooth' in notes):
            appreciate_counts['Smooth Delivery'] = appreciate_counts.get('Smooth Delivery', 0) + 1

    appreciate_sorted = sorted(appreciate_counts.items(), key=lambda x: -x[1])
    appreciate_list = [item[0] for item in appreciate_sorted[:4]] if appreciate_sorted else []

    # --- Feedback Breakdown ---
    feedback = _extract_feedback(recent_messages, conv_history)
    complaints_list = feedback['complaints'][:3]
    suggestions_list = [s['label'] for s in feedback['suggestions'][:3]]
    praise_list = [p['label'] for p in feedback['praise'][:3]]

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
        'appreciate': appreciate_list if appreciate_list else ['Friendly Staff', 'Product Quality', 'Fast Service', 'Smooth Delivery'],
        'feedback': {
            'complaints': complaints_list if complaints_list else [],
            'suggestions': suggestions_list if suggestions_list else [],
            'praise': praise_list if praise_list else [],
        },
        'at_risk_customers': at_risk_customers[:10],
    }
