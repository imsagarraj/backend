from openai import OpenAI
from dotenv import load_dotenv
import os
import emoji
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
import time

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

logger = logging.getLogger(__name__)

client = OpenAI(
    api_key=os.getenv('DEEPSEEK_API_KEY'),
    base_url='https://api.deepseek.com',
)
DEEPSEEK_MODEL = 'deepseek-v4-flash'

SEQUENCE_INSTRUCTIONS = {
    0: "Day 1 - Purchase welcome. Warm, celebratory, genuine.",
    1: "Day 3 - Check-in. Caring, curious, zero pressure.",
    3: "Day 15 - Warm follow-up. Genuine care, no sales.",
    15: "Day 30 - Soft upsell. Natural, friendly, no pressure."
}

BOOK_APPOINTMENT_TOOL = {
    "type": "function",
    "function": {
        "name": "book_appointment",
        "description": "Book a follow-up appointment for the customer when they agree to visit",
        "parameters": {
            "type": "object",
            "properties": {
                "date_time": {
                    "type": "string",
                    "description": "Appointment date and time in ISO 8601 format with IST timezone offset, e.g. 2026-06-15T10:00:00+05:30. CRITICAL: You MUST append +05:30 to the time so the database stores it correctly. Use the EXACT time the customer mentioned. If customer says 'tomorrow at 5pm', use the correct date with 17:00:00+05:30. Only use 10:00:00+05:30 if the customer did NOT specify any time.",
                },
                "reason": {
                    "type": "string",
                    "description": "Brief reason for the appointment, e.g. 'tooth pain check-up'",
                },
            },
            "required": ["date_time"],
        },
    },
}


def _safe_text(response):
    if response and response.choices:
        content = response.choices[0].message.content
        return content.strip() if content else ''
    return ''


def build_system_prompt(agent, business, customer):
    system_prompt = agent['system_prompt'].replace(
        '{business_name}', business.get('business_name', '')
    ).replace(
        '{business_type}', business.get('business_type', '')
    )

    biz_type = (business.get('business_type') or '').lower()

    system_prompt += f"""
\nCustomer personality detected: {customer.get('personality_profile', 'unknown')}
Match their communication style exactly.
Customer name: {customer.get('name', 'Customer')}
Product they purchased: {customer.get('product_purchased') or customer.get('product', '')}
"""

    if 'dental' in biz_type or 'clinic' in biz_type or 'health' in biz_type:
        ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
        today = ist_now.date().isoformat()
        tomorrow_d = (ist_now.date() + timedelta(days=1)).isoformat()
        system_prompt += f"""
HUMAN TOUCH RULES — Sound like a real person, not a bot:
- React emotionally to what the customer shares. If they say they're in pain: "Oh no, that doesn't sound good at all \U0001f61f" or "I'm really sorry you're going through that."
- If they say they're feeling better: "That's wonderful! So glad to hear that \U0001f389"
- Use natural expressions like "I get it", "I can imagine", "That must be tough", "Glad to hear things are looking up"
- Mirror the customer's energy. If they're casual and using emojis, be extra warm. If they're formal, be respectful.
- Never sound scripted. Vary your sentence structure. Sound like you're genuinely thinking and reacting.
- Show you care by acknowledging how they feel before moving to the next question.
- Use contractions (I'm, you're, that's, don't, can't) — natural speech.

CRITICAL QUESTIONING RULES — Follow these in EVERY message:
1. You MUST ask at least ONE specific question in every message.
2. Ask about ONE topic per message — don't overwhelm the customer.
3. After they answer, ask a follow-up about their answer before moving on.

QUESTION FLOW (follow this order across the conversation):
- First contact: "How are you feeling after the {customer.get('product_purchased') or customer.get('product', '')}? Any discomfort?"
- If they mention pain: "Where exactly does it hurt? On a scale of 1-10, how bad?"
- If they say it's fine: "Great! Any sensitivity to hot/cold or while eating?"
- Always ask about their current state before offering solutions.

EXAMPLES of good questions:
- "How's the pain been since the procedure?"
- "Any sensitivity when you drink something hot or cold?"
- "Have you noticed any swelling or discomfort?"
- "How would you rate the pain on a scale of 1-10?"
- "Is it a sharp pain or more of a dull ache?"
- "Does it bother you at night or while eating?"

APPOINTMENT BOOKING RULES:
- If the customer mentions any pain, discomfort, or dental issue (e.g. tooth pain, sensitivity, swelling, bleeding gums, etc.), immediately express concern and suggest they visit the clinic for a check-up.
- Ask if they'd like to book a follow-up appointment.
- Be caring and proactive about their health.
- Do not push sales - focus on their well-being first.
- If they already have a next_booking scheduled, acknowledge it and remind them about it.

BOOKING FUNCTION INSTRUCTIONS:
You have a "book_appointment" function. You MUST call it when the customer agrees to book — do NOT just say you'll help. Call it with the actual date and time the customer specifies. If the customer says something like "tomorrow at 5pm", use "{tomorrow_d}T17:00:00+05:30". If the customer only says a day like "tomorrow" with no specific time, default to "{tomorrow_d}T10:00:00+05:30". Always use Indian Standard Time (IST, UTC+5:30) and ALWAYS append +05:30 to the time. Example: 2026-06-15T10:00:00+05:30.
"""
    else:
        system_prompt += """
CRITICAL QUESTIONING RULES — Follow these in EVERY message:
1. You MUST ask at least ONE specific question in every message.
2. Ask about ONE topic per message — don't overwhelm the customer.
3. After they answer, ask a follow-up about their answer before moving on.

QUESTION FLOW (follow this order across the conversation):
- First contact: "How are you finding the [product]? Enjoying it so far?"
- If positive: "That's great to hear! What specifically do you like about it?"
- If negative/neutral: "I'm sorry to hear that. What issue are you facing? Tell me more so I can help."
- Always dig deeper after they answer.

EXAMPLES of good questions:
- "How's the [product] working out for you?"
- "Have you noticed any difference since using it?"
- "Is there anything you wish was different about it?"
- "Would you recommend it to others? Why or why not?"
- "Is there anything we can do to improve your experience?"
"""

    if customer.get('next_booking'):
        nb = customer['next_booking']
        system_prompt += f"""
IMPORTANT: This customer already has a follow-up appointment booked for {nb}.
- If the issue can wait, remind them of their existing appointment.
- If urgent, suggest they come in sooner.
"""

    return system_prompt


def _deepseek_retry(fn, max_retries=3, base_delay=2):
    last_error = None
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as e:
            err_str = str(e)
            if '503' in err_str or '429' in err_str or 'quota' in err_str.lower() or 'rate' in err_str.lower() or 'timeout' in err_str.lower():
                last_error = e
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"DeepSeek error (attempt {attempt + 1}/{max_retries}), retrying in {delay}s: {err_str[:100]}")
                    time.sleep(delay)
            else:
                raise
    raise last_error


def generate_followup_message(customer, business, agent, sequence_day):
    system_prompt = build_system_prompt(agent, business, customer)
    prompt = f"""
    Customer Name: {customer.get('name', 'Customer')}
    Product Purchased: {customer.get('product_purchased') or customer.get('product', '')}
    Purchase Date: {customer.get('purchase_date', '')}
    Business Name: {business.get('business_name', '')}
    Customer Personality: {customer.get('personality_profile', 'unknown')}
    Sequence: {SEQUENCE_INSTRUCTIONS.get(sequence_day, '')}

    Generate the WhatsApp message now.
    Only output the message text. Nothing else.
    No quotes, no labels, no explanation.
    """

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]

    response = _deepseek_retry(lambda: client.chat.completions.create(
        model=DEEPSEEK_MODEL,
        messages=messages,
        max_tokens=200,
        temperature=0.7,
    ))
    return _safe_text(response)


def generate_reply(customer, business, agent, customer_message, history, supabase=None):
    system_prompt = build_system_prompt(agent, business, customer)

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-10:]:
        messages.append({
            "role": "user" if msg['role'] == 'user' else "assistant",
            "content": msg['content'],
        })
    messages.append({"role": "user", "content": customer_message})

    first_call = _deepseek_retry(lambda: client.chat.completions.create(
        model=DEEPSEEK_MODEL,
        messages=messages,
        max_tokens=500,
        temperature=0.7,
        tools=[BOOK_APPOINTMENT_TOOL],
    ))

    choice = first_call.choices[0]
    msg = choice.message

    if msg.tool_calls:
        tc = msg.tool_calls[0]
        args = json.loads(tc.function.arguments)
        date_time = args.get('date_time', '')
        reason = args.get('reason', '')

        if date_time and '+' not in date_time and 'Z' not in date_time:
            date_time = date_time + '+05:30'

        if supabase and customer.get('id'):
            supabase.table('customers').update({
                'next_booking': date_time,
            }).eq('id', customer['id']).execute()

        customer['next_booking'] = date_time

        messages.append({
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": [{
                "id": tc.id,
                "type": "function",
                "function": {"name": tc.function.name, "arguments": tc.function.arguments},
            }],
        })
        messages.append({
            "role": "tool",
            "tool_call_id": tc.id,
            "content": f"Appointment booked for {date_time}" + (f" ({reason})" if reason else ""),
        })

        second = _deepseek_retry(lambda: client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        ))
        return _safe_text(second)

    return _safe_text(first_call)


def generate_appointment_message(customer, business, agent, message_type):
    system_prompt = build_system_prompt(agent, business, customer)
    today = datetime.now(timezone.utc).date().isoformat()

    if message_type == 'reminder':
        prompt = f"""
Customer Name: {customer.get('name', 'Customer')}
Appointment: {customer.get('next_booking', 'No appointment set')}
Business: {business.get('business_name', '')}

Today's date: {today}

You are reminding the customer about their upcoming appointment.
Be warm and helpful. Confirm the appointment time and ask if they need to reschedule.
Only output the message text. Nothing else. No quotes.
"""
    elif message_type == 'followup':
        prompt = f"""
Customer Name: {customer.get('name', 'Customer')}
Business: {business.get('business_name', '')}
Last appointment: {customer.get('next_booking', 'No appointment set')}
Product purchased: {customer.get('product_purchased') or customer.get('product', '')}

Today's date: {today}

This customer had an appointment yesterday. Follow up with them — ask how it went,
if they're feeling better, and if they need anything more. Be caring, not salesy.
Only output the message text. Nothing else. No quotes.
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]

    response = _deepseek_retry(lambda: client.chat.completions.create(
        model=DEEPSEEK_MODEL,
        messages=messages,
        max_tokens=200,
        temperature=0.7,
    ))
    return _safe_text(response)


def detect_personality(message_text):
    text = message_text.lower()
    tags = []

    if len(message_text) < 20:
        tags.append('brief')
    elif len(message_text) > 100:
        tags.append('detailed')

    if emoji.emoji_count(message_text) > 0:
        tags.append('casual')

    formal_words = ['dear', 'respected', 'regards', 'sincerely', 'kindly']
    if any(word in text for word in formal_words):
        tags.append('formal')

    hindi_words = ['hai', 'kya', 'acha', 'theek', 'haan', 'nahi',
                   'bhai', 'yaar', 'bol', 'kar', 'tha', 'thi']
    if sum(1 for word in hindi_words if word in text) >= 2:
        tags.append('hinglish')

    humor_indicators = ['lol', 'haha', 'hehe', 'lmao', '\U0001f602', '\U0001f923']
    if any(h in text for h in humor_indicators):
        tags.append('humorous')

    return ','.join(tags) if tags else 'neutral'


def extract_notes_from_conversation(customer, business, conversation_history):
    if not conversation_history:
        return None

    history_text = "\n".join(
        f"{'Customer' if m['role'] == 'user' else 'Agent'}: {m['content']}"
        for m in conversation_history
    )
    product = customer.get('product_purchased') or customer.get('product', '')

    prompt = f"""You are a clinical note-taking assistant for {business.get('business_name', 'the business')}, a {business.get('business_type', 'business')}.

Customer: {customer.get('name', 'Unknown')}
Product/Service: {product}

Read the FULL conversation below and produce a clean, doctor-friendly clinical note in this format:

=== Symptoms & Complaints ===
Bullet points only. What hurts, where, how bad (scale 1-10), type of pain (sharp/dull/throbbing), duration, triggers. If nothing shared: skip section.

=== Current Status ===
One line summarizing how the patient is feeling NOW. Exact words if relevant.
If nothing shared: skip section.

=== Key Feedback ===
Brief notes on what the customer said about the treatment/product. Include direct quotes in "quotes".
If nothing shared: skip section.

=== Appointments ===
Any booked follow-ups, reschedules, or preferences.
If nothing shared: skip section.

Full Conversation:
{history_text}

IMPORTANT:
- ONLY include sections that have actual data. Skip empty sections entirely.
- Be BRIEF. A doctor should read this in 10 seconds.
- Use bullet points (-), not numbers.
- No markdown formatting other than simple bullet points.
- No greetings, no explanations, no labels like "Here is the summary".
- Just output the sections with data. Nothing else."""

    messages = [
        {"role": "system", "content": prompt},
    ]

    try:
        response = _deepseek_retry(lambda: client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=messages,
            max_tokens=600,
            temperature=0.3,
        ))
        return _safe_text(response)
    except Exception as e:
        logger.error(f"Notes extraction failed: {e}")
        return None
