from google import genai
from google.genai import types
from dotenv import load_dotenv
import os
import emoji
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
GEMINI_MODEL = 'gemini-2.5-flash'

SEQUENCE_INSTRUCTIONS = {
    0: "Day 1 - Purchase welcome. Celebrate their purchase, ask how they're feeling, invite them to reach out with any questions about the product/service.",
    1: "Day 3 - Health/service check-in. Ask how they're doing since the purchase. Inquire about their experience, any concerns, or how the product/service is working for them.",
    3: "Day 15 - Genuine care follow-up. Ask about their overall satisfaction. Check if they need any support, tips, or a follow-up visit. Make it conversational — ask questions that invite a reply.",
    15: "Day 30 - Value-added check. Ask about their experience so far. Offer help, tips, or a complimentary check-up if relevant. Focus on their well-being, not sales."
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
\nCUSTOMER CONTEXT:
- Name: {customer.get('name', 'Customer')}
- Product/Service: {customer.get('product_purchased') or customer.get('product', '')}
- Purchase Date: {customer.get('purchase_date', '')}
- Personality: {customer.get('personality_profile', 'unknown')}
- Previous responses: {(customer.get('response_count') or 0)}
- Has appointment: {'Yes' if customer.get('next_booking') else 'No'}

CONVERSATION INSTRUCTIONS:
- Match their communication style exactly
- Be conversational: ask questions that invite replies
- Show genuine interest in their well-being and experience
- If they mention any problem or concern, address it with care
- Build rapport naturally over multiple interactions
"""

    if 'dental' in biz_type or 'clinic' in biz_type or 'health' in biz_type:
        ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
        today = ist_now.date().isoformat()
        tomorrow_d = (ist_now.date() + timedelta(days=1)).isoformat()
        system_prompt += f"""
APPOINTMENT BOOKING RULES:
- If the customer mentions any pain, discomfort, or dental issue (e.g. tooth pain, sensitivity, swelling, bleeding gums, etc.), immediately express concern and suggest they visit the clinic for a check-up.
- Ask if they'd like to book a follow-up appointment.
- Be caring and proactive about their health.
- Do not push sales - focus on their well-being first.
- If they already have a next_booking scheduled, acknowledge it and remind them about it.

BOOKING FUNCTION INSTRUCTIONS:
You have a "book_appointment" function. You MUST call it when the customer agrees to book — do NOT just say you'll help. Call it with the actual date and time the customer specifies. If the customer says something like "tomorrow at 5pm", use "{tomorrow_d}T17:00:00+05:30". If the customer only says a day like "tomorrow" with no specific time, default to "{tomorrow_d}T10:00:00+05:30". Always use Indian Standard Time (IST, UTC+5:30) and ALWAYS append +05:30 to the time. Example: 2026-06-15T10:00:00+05:30.
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
    Business Type: {business.get('business_type', '')}
    Customer Personality: {customer.get('personality_profile', 'unknown')}
    Customer has replied before: {'Yes' if (customer.get('response_count') or 0) > 0 else 'No'}
    Last contact: {customer.get('last_contact', 'None yet')}
    Sequence: {SEQUENCE_INSTRUCTIONS.get(sequence_day, '')}

    CRITICAL INSTRUCTIONS:
    - Write a natural WhatsApp message that sounds like a real person texting a customer
    - Ask open-ended questions about their health, experience, or how the product is working
    - Show genuine interest in their well-being
    - If this is a health/care business, ask how they're feeling since the treatment
    - The goal is to start a conversation, not deliver a monologue
    - End with a question that invites them to reply
    - Keep it under 80 words
    - Match your agent personality perfectly
    - Only output the message text. Nothing else.
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
Business Type: {business.get('business_type', '')}

Today's date: {today}

You are reminding the customer about their upcoming appointment.
- Be warm and caring
- Confirm the appointment time
- Ask if they have any concerns or questions before the visit
- Offer to reschedule if needed
- End with a friendly, reassuring note
Only output the message text. Nothing else. No quotes.
"""
    elif message_type == 'followup':
        prompt = f"""
Customer Name: {customer.get('name', 'Customer')}
Business: {business.get('business_name', '')}
Business Type: {business.get('business_type', '')}
Last appointment: {customer.get('next_booking', 'No appointment set')}
Product purchased: {customer.get('product_purchased') or customer.get('product', '')}

Today's date: {today}

This customer had an appointment yesterday/earlier. Follow up with them:
- Ask how they're feeling since the visit
- Ask about their experience — was everything satisfactory?
- If it was for treatment, ask how they're recovering
- If they mentioned any issues, check up on those specifically
- Offer further help if needed
- Be caring and genuine, not salesy
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
