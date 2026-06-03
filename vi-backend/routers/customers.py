from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from database.supabase_client import get_supabase
from pydantic import BaseModel
from typing import Optional
from datetime import date
import csv
import io

router = APIRouter()


class CustomerCreate(BaseModel):
    user_id: str
    name: str
    phone: str
    email: Optional[str] = None
    gender: Optional[str] = None
    product: str
    purchase_date: date
    order_value: Optional[float] = None
    order_id: Optional[str] = None
    notes: Optional[str] = None
    next_booking: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[str] = None
    product: Optional[str] = None
    purchase_date: Optional[date] = None
    order_value: Optional[float] = None
    order_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    stage: Optional[str] = None
    next_booking: Optional[str] = None


@router.post("/customers")
def create_customer(data: CustomerCreate):
    supabase = get_supabase()
    result = supabase.table('customers').insert(data.model_dump()).execute()
    return result.data[0]


@router.get("/customers")
def list_customers(business_id: int = None, page: int = 1, limit: int = 50):
    supabase = get_supabase()
    query = supabase.table('customers').select('*', count='exact')

    if business_id:
        query = query.eq('business_id', business_id)

    query = query.order('created_at', desc=True).range((page - 1) * limit, page * limit - 1)
    result = query.execute()
    total = result.count if hasattr(result, 'count') else len(result.data)
    return {"customers": result.data, "total": total, "page": page, "limit": limit}


@router.get("/customers/{customer_id}")
def get_customer(customer_id: int):
    supabase = get_supabase()
    customer = supabase.table('customers').select('*').eq('id', customer_id).execute()
    if not customer.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    messages = supabase.table('messages').select('*').eq(
        'customer_id', customer_id
    ).order('timestamp').execute()

    return {"customer": customer.data[0], "messages": messages.data}


@router.put("/customers/{customer_id}")
def update_customer(customer_id: int, data: CustomerUpdate):
    supabase = get_supabase()
    payload = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    result = supabase.table('customers').update(payload).eq('id', customer_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    return result.data[0]


@router.delete("/customers/{customer_id}")
def delete_customer(customer_id: int):
    supabase = get_supabase()
    result = supabase.table('customers').delete().eq('id', customer_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"status": "deleted"}


@router.post("/customers/{customer_id}/pause")
def pause_customer(customer_id: int):
    supabase = get_supabase()
    result = supabase.table('customers').update({'status': 'paused'}).eq('id', customer_id).execute()
    return {"status": "paused"}


@router.post("/customers/{customer_id}/resume")
def resume_customer(customer_id: int):
    supabase = get_supabase()
    result = supabase.table('customers').update({'status': 'active'}).eq('id', customer_id).execute()
    return {"status": "resumed"}


@router.post("/customers/import")
async def import_customers(file: UploadFile = File(...)):
    supabase = get_supabase()
    content = await file.read()
    decoded = content.decode()
    reader = csv.DictReader(io.StringIO(decoded))

    imported = 0
    failed = 0
    errors = []

    for row in reader:
        try:
            data = {
                'user_id': row['user_id'],
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
            errors.append({"row": row.get('phone', 'unknown'), "error": str(e)})

    return {"imported": imported, "failed": failed, "errors": errors}
