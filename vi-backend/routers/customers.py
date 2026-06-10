from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from database.supabase_client import get_supabase
from dependencies import get_current_user, get_user_business_id, AuthUser
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date
import csv
import io

router = APIRouter()


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(..., min_length=5, max_length=20)
    email: Optional[EmailStr] = None
    gender: Optional[str] = None
    product: str = Field(..., min_length=1, max_length=200)
    purchase_date: date
    order_value: Optional[float] = Field(None, ge=0)
    order_id: Optional[str] = None
    notes: Optional[str] = None
    next_booking: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    phone: Optional[str] = Field(None, min_length=5, max_length=20)
    email: Optional[EmailStr] = None
    gender: Optional[str] = None
    product: Optional[str] = Field(None, min_length=1, max_length=200)
    purchase_date: Optional[date] = None
    order_value: Optional[float] = Field(None, ge=0)
    order_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    stage: Optional[str] = None
    next_booking: Optional[str] = None


@router.post("/customers")
def create_customer(data: CustomerCreate, user: AuthUser = Depends(get_current_user), biz_id: int = Depends(get_user_business_id)):
    supabase = get_supabase()
    payload = data.model_dump()
    payload['user_id'] = user.id
    payload['business_id'] = biz_id
    result = supabase.table('customers').insert(payload).execute()
    return result.data[0]


@router.get("/customers")
def list_customers(user: AuthUser = Depends(get_current_user), page: int = 1, limit: int = 50):
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
    payload = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
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
    if not file.filename or not file.filename.endswith('.csv'):
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
            data = {
                'user_id': user.id,
                'business_id': biz_id,
                'name': row['name'],
                'phone': row['phone'],
                'product': row['product'],
                'purchase_date': row['purchase_date'],
                'email': row.get('email'),
                'gender': row.get('gender'),
                'order_value': float(row['order_value']) if row.get('order_value') else None,
                'order_id': row.get('order_id'),
                'notes': row.get('notes'),
            }
            supabase.table('customers').insert(data).execute()
            imported += 1
        except Exception as e:
            failed += 1
            errors.append({"row": row.get('phone', 'unknown'), "error": str(e)[:100]})

    return {"imported": imported, "failed": failed, "errors": errors}
