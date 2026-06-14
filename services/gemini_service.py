from google import genai
from google.genai import types
from dotenv import load_dotenv
import os
import emoji
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

logger = logging.getLogger(__name__)

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
GEMINI_MODEL = 'gemini-2.5-flash'

SEQUENCE_INSTRUCTIONS = {
    0: "Day 1 - Purchase welcome. Warm, celebratory, genuine.",
    1: "Day 3 - Check-in. Caring, curious, zero pressure.",
    3: "Day 15 - Warm follow-up. Genuine care, no sales.",
    15: "Day 30 - Soft upsell. Natural, friendly, no pressure."
}

BOOK_APPOINTMENT_FUNC = types.FunctionDeclaration(
    name="book_appointment",
    description="Book a follow-up appointment for the customer when they agree to visit",
    parameters={
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
)

APPOINTMENT_TOOL = types.Tool(function_declarations=[BOOK_APPOINTMENT_FUNC])


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
CONVERSATION GOALS:
- Actively ask the customer about their condition — how they're feeling, any pain, discomfort, or issues they're experiencing.
- For dental: ask about tooth pain, sensitivity, swelling, bleeding gums, etc.
- Respond with genuine care and concern for their health.
- DO NOT just reply generically — probe for details about their symptoms.
- After they share, acknowledge and suggest next steps (check-up, booking, etc.).
- Keep the conversation focused on understanding their condition.

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
CONVERSATION GOALS:
- Actively ask the customer about their experience with the product/service they purchased.
- Ask how they're finding it, if they have any feedback, or if they need any help.
- Respond genuinely to what they share.
- Probe for details about their experience and satisfaction.
- Note any complaints, issues, or positive feedback they provide.
"""

    if customer.get('next_booking'):
        nb = customer['next_booking']
        system_prompt += f"""
IMPORTANT: This customer already has a follow-up appointment booked for {nb}.
- If the issue can wait, remind them of their existing appointment.
- If urgent, suggest they come in sooner.
"""

    return system_prompt


def generate_followup_message(customer, business, agent, sequence_day):
    system_prompt = build_system_prompt(agent, business, customer)

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        max_output_tokens=200,
        temperature=0.7
    )

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

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=config
    )
    return response.text.strip()


def generate_reply(customer, business, agent, customer_message, history, supabase=None):
    system_prompt = build_system_prompt(agent, business, customer)

    gemini_history = []
    for msg in history[-10:]:
        gemini_history.append(types.Content(
            role=msg['role'],
            parts=[types.Part.from_text(text=msg['content'])]
        ))

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        tools=[APPOINTMENT_TOOL],
        max_output_tokens=500,
        temperature=0.7
    )

    chat = client.chats.create(
        model=GEMINI_MODEL,
        config=config,
        history=gemini_history
    )

    response = chat.send_message(customer_message)

    fc = response.candidates[0].content.parts[0].function_call if response.candidates else None

    if fc:
        args = {k: v for k, v in fc.args.items()}
        date_time = args.get('date_time', '')
        reason = args.get('reason', '')

        if date_time and '+' not in date_time and 'Z' not in date_time:
            date_time = date_time + '+05:30'

        if supabase and customer.get('id'):
            supabase.table('customers').update({
                'next_booking': date_time,
            }).eq('id', customer['id']).execute()

        confirm_msg = f"✅ Appointment booked for {date_time}" + (f" ({reason})" if reason else "")
        customer['next_booking'] = date_time

        final = chat.send_message(
            f"The appointment has been booked for {date_time}. "
            f"Now confirm this to the customer in your own voice. "
            f"Thank them and tell them when to expect the appointment."
        )
        return final.text.strip()

    return response.text.strip()


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

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        max_output_tokens=200,
        temperature=0.7
    )

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=config
    )
    return response.text.strip()


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
    biz_type = (business.get('business_type') or '').lower()
    product = customer.get('product_purchased') or customer.get('product', '')

    prompt = f"""You are a clinical note-taking assistant for {business.get('business_name', 'the business')}, a {business.get('business_type', 'business')}.

Customer: {customer.get('name', 'Unknown')}
Product/Service: {product}

Read the FULL conversation below. Extract EVERY detail the customer shared into a structured summary with these sections:

1. **Symptoms/Complaints** — Any pain, discomfort, issues, or problems the customer reported. Include location, severity, duration, and what makes it better/worse. If dental: tooth number, type of pain (throbbing/sharp/dull), sensitivity details.
2. **Current Status** — What is the customer feeling NOW? Is the pain/issue resolved? Improved? Same? Worse? Exact words they used.
3. **Feedback/Review** — Exactly what the customer said about the product/service/treatment. Positive, negative, or mixed. Direct quotes if possible.
4. **Agent's Questions & Customer's Answers** — What the agent asked and what the customer replied for each question (e.g., Asked about pain level → said 7/10; Asked about recovery → said feeling much better).
5. **Concerns & Questions** — Any worries, doubts, or questions the customer raised.
6. **Appointments** — Any booked appointments, reschedules, or preferences mentioned.
7. **Communication Preferences** — Preferred time to contact, language (Hindi/English/Hinglish), response style.

Full Conversation:
{history_text}

Return the summary using the numbered sections above. Be thorough — include direct quotes where relevant. If a section has no data, write "None shared yet." Do NOT skip any section.
Only output the summary. Nothing else."""

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=600,
                temperature=0.3,
            ),
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Notes extraction failed: {e}")
        return None
