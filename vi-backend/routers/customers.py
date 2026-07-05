from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Request
from database.supabase_client import get_supabase
from dependencies import get_current_user, get_user_business_id, AuthUser
from database.seed import get_active_agent
from services.whatsapp_service import send_text_message, send_template_message
from services.deepseek_service import generate_followup_message, extract_notes_from_conversation
from services.followup_service import generate_followup_sequence, insert_welcome_touch
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Annotated
from datetime import date, datetime, timezone
from rate_limit import limiter
import csv
import io
import logging


class CsvCustomerRow(BaseModel):
    model_config = {'extra': 'forbid'}
    name: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(..., min_length=5, max_length=20)
    product: str = Field(..., min_length=1, max_length=200)
    purchase_date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    email: Optional[str] = Field(None, max_length=320)
    gender: Optional[str] = Field(None, max_length=16)
    order_value: Optional[float] = Field(None, ge=0)
    order_id: Optional[str] = Field(None, max_length=64)
    notes: Optional[str] = Field(None, max_length=2000)

logger = logging.getLogger(__name__)

router = APIRouter()


class CustomerCreate(BaseModel):
    model_config = {'extra': 'forbid'}
    name: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(..., min_length=5, max_length=20)
    email: Optional[EmailStr] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    city: Optional[str] = None
    product: str = Field(..., min_length=1, max_length=200)
    purchase_date: Optional[date] = None
    order_value: Optional[float] = Field(None, ge=0)
    order_id: Optional[str] = None
    notes: Optional[str] = None
    next_booking: Optional[str] = None
    stage: Optional[str] = None
    status: Optional[str] = None
    start_sequence: Optional[bool] = True


class CustomerUpdate(BaseModel):
    model_config = {'extra': 'forbid'}
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    phone: Optional[str] = Field(None, min_length=5, max_length=20)
    email: Optional[EmailStr] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    city: Optional[str] = None
    product: Optional[str] = Field(None, min_length=1, max_length=200)
    purchase_date: Optional[date] = None
    order_value: Optional[float] = Field(None, ge=0)
    order_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    stage: Optional[str] = None
    next_booking: Optional[str] = None
    start_sequence: Optional[bool] = None


def send_welcome_message(customer: dict, biz_id: int) -> dict:
    supabase = get_supabase()
    try:
        biz = supabase.table('business_profiles').select('*').eq('id', biz_id).execute()
        if not biz.data:
            return {"status": "skipped", "reason": "Business profile not found"}

        business = biz.data[0]
        agent = get_active_agent(biz_id)
        if not agent:
            return {"status": "skipped", "reason": "No active AI agent assigned"}

        pn_id = business.get('meta_phone_number_id')
        if not pn_id:
            return {"status": "skipped", "reason": "WhatsApp not configured (no meta_phone_number_id). Save your WhatsApp number in Business Profile first."}

        send_template_message(
            customer['phone'],
            'welcome_trigger',
            [],
            phone_number_id=pn_id,
            language='en_US',
        )

        try:
            welcome_text = generate_followup_message(customer, business, agent, 0)
        except Exception as e:
            logger.warning(f"AI generation failed: {e}")
            welcome_text = None

        if not welcome_text:
            welcome_text = f"Hi {customer.get('name', 'there')}! 👋 Welcome to {business.get('business_name', 'us')}. We're so glad you chose us. How are you finding your {customer.get('product', 'purchase')} so far? 😊"

        send_result = send_text_message(customer['phone'], welcome_text, phone_number_id=pn_id)
        if send_result.get('status') != 'success':
            return {"status": "failed", "reason": f"Meta API error: {send_result.get('response', {}).get('error', {}).get('message', send_result.get('error', 'Unknown'))}"}

        supabase.table('messages').insert({
            'customer_id': customer['id'],
            'business_id': biz_id,
            'direction': 'sent',
            'content': welcome_text,
            'status': 'sent',
            'meta_message_id': send_result.get('message_id'),
            'sequence_day': 1,
        }).execute()

        try:
            supabase.table('conversation_history').insert({
                'customer_id': customer['id'],
                'role': 'model',
                'content': welcome_text,
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to insert welcome into conversation_history: {e}")

        supabase.table('customers').update({
            'current_sequence_day': 1,
            'last_contact': datetime.now(timezone.utc).isoformat(),
        }).eq('id', customer['id']).execute()

        today_date = datetime.now(timezone.utc).strftime('%d %b %Y')
        initial_history = supabase.table('conversation_history').select('*').eq(
            'customer_id', customer['id']
        ).order('timestamp').execute()
        extracted = None
        if initial_history.data:
            extracted = extract_notes_from_conversation(customer, business, initial_history.data)
        if extracted:
            supabase.table('customers').update({
                'notes': f"--- {today_date} ---\n{extracted}"
            }).eq('id', customer['id']).execute()

        try:
            insert_welcome_touch(customer, business)
            generate_followup_sequence(customer, business, agent, start_touch=2)
        except Exception as e:
            logger.warning(f"Failed to generate follow-up sequence for {customer.get('id')}: {e}")

        return {"status": "sent", "message_id": send_result.get('message_id')}
    except Exception as e:
        logger.error(f"Unexpected error sending welcome to customer {customer.get('id')}: {e}")
        return {"status": "error", "reason": str(e)}


@router.post("/customers")
@limiter.limit("10/minute")
def create_customer(request: Request, data: CustomerCreate, background_tasks: BackgroundTasks, user: AuthUser = Depends(get_current_user), biz_id: int = Depends(get_user_business_id)):
    supabase = get_supabase()
    payload = data.model_dump(mode='json')
    payload['user_id'] = user.id
    payload['business_id'] = biz_id
    phone = payload['phone'].replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    if not phone.isdigit():
        raise HTTPException(status_code=400, detail="Phone must contain only digits after stripping formatting")
    payload['phone'] = phone

    existing = supabase.table('customers').select('id').eq('phone', phone).eq('business_id', biz_id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Customer with this phone already exists in your business")

    if not payload.get('purchase_date'):
        payload['purchase_date'] = datetime.now(timezone.utc).date().isoformat()
    payload['status'] = 'active'
    result = supabase.table('customers').insert(payload).select().execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create customer")

    customer = result.data[0]
    background_tasks.add_task(send_welcome_message, customer, biz_id)
    logger.info(f"Welcome message queued for customer {customer['id']} (phone={phone})")
    return customer


@router.get("/customers")
def list_customers(user: AuthUser = Depends(get_current_user), page: Annotated[int, Field(ge=1)] = 1, limit: Annotated[int, Field(ge=1, le=200)] = 50):
    supabase = get_supabase()
    query = supabase.table('customers').select('*', count='exact').eq('user_id', user.id)
    query = query.order('created_at', desc=True).range((page - 1) * limit, page * limit - 1)
    result = query.execute()
    total = result.count if hasattr(result, 'count') else len(result.data)
    return {"customers": result.data, "total": total, "page": page, "limit": limit}


@router.get("/customers/{customer_id}")
def get_customer(customer_id: int, user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    customer = supabase.table('customers').select('*').eq('id', customer_id).eq('user_id', user.id).execute()
    if not customer.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    messages = supabase.table('messages').select('*').eq(
        'customer_id', customer_id
    ).order('timestamp').execute()

    return {"customer": customer.data[0], "messages": messages.data}


@router.put("/customers/{customer_id}")
def update_customer(customer_id: int, data: CustomerUpdate, user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    payload = {k: v for k, v in data.model_dump(exclude_unset=True, mode='json').items() if v is not None}
    result = supabase.table('customers').update(payload).eq('id', customer_id).eq('user_id', user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    return result.data[0]


@router.delete("/customers/{customer_id}")
def delete_customer(customer_id: int, user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table('customers').delete().eq('id', customer_id).eq('user_id', user.id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"status": "deleted"}


@router.post("/customers/{customer_id}/pause")
def pause_customer(customer_id: int, user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table('customers').update({'status': 'paused'}).eq('id', customer_id).eq('user_id', user.id).execute()
    return {"status": "paused"}


@router.post("/customers/{customer_id}/resume")
def resume_customer(customer_id: int, user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table('customers').update({'status': 'active'}).eq('id', customer_id).eq('user_id', user.id).execute()
    return {"status": "resumed"}


@router.post("/customers/import")
async def import_customers(file: UploadFile = File(...), user: AuthUser = Depends(get_current_user), biz_id: int = Depends(get_user_business_id)):
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")

    supabase = get_supabase()
    decoded = content.decode()
    reader = csv.DictReader(io.StringIO(decoded))

    required_fields = {'name', 'phone', 'product', 'purchase_date'}
    if not required_fields.issubset(reader.fieldnames or []):
        raise HTTPException(status_code=400, detail=f"CSV must contain columns: {', '.join(required_fields)}")

    imported = 0
    failed = 0
    errors = []

    for row in reader:
        try:
            validated = CsvCustomerRow(
                name=row.get('name', ''),
                phone=row.get('phone', ''),
                product=row.get('product', ''),
                purchase_date=row.get('purchase_date', ''),
                email=row.get('email'),
                gender=row.get('gender'),
                order_value=float(row['order_value']) if row.get('order_value') else None,
                order_id=row.get('order_id'),
                notes=row.get('notes'),
            )
            data = validated.model_dump()
            data['user_id'] = user.id
            data['business_id'] = biz_id
            data['status'] = 'active'
            supabase.table('customers').insert(data).execute()
            imported += 1
        except Exception as e:
            failed += 1
            logger.warning(f"CSV import row failed (phone={row.get('phone', 'unknown')}): {e}")
            errors.append({"row": row.get('phone', 'unknown'), "error": "Validation failed"})

    return {"imported": imported, "failed": failed, "errors": errors}
