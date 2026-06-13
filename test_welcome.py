import os
import sys
import logging

logging.basicConfig(level=logging.INFO)

# Make sure we can import from local path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.supabase_client import get_supabase
from database.seed import get_active_agent
from services.gemini_service import generate_followup_message
from services.whatsapp_service import send_text_message

def test_welcome():
    supabase = get_supabase()

    # 1. Fetch latest customer
    print("Fetching latest customer...")
    customers = supabase.table('customers').select('*').order('created_at', desc=True).limit(1).execute()
    if not customers.data:
        print("No customers found in database.")
        return

    customer = customers.data[0]
    print(f"Latest Customer ID: {customer.get('id')}")
    print(f"Customer Details: {customer}")

    biz_id = customer.get('business_id')
    if not biz_id:
        print("Customer does not have a business_id!")
        return

    # 2. Fetch business profile
    print(f"Fetching business profile with ID: {biz_id}...")
    biz = supabase.table('business_profiles').select('*').eq('id', biz_id).execute()
    if not biz.data:
        print(f"Business profile with ID {biz_id} not found.")
        return

    business = biz.data[0]
    print(f"Business Profile Details: {business}")

    meta_phone_number_id = business.get('meta_phone_number_id')
    print(f"meta_phone_number_id: {meta_phone_number_id}")

    # 3. Get active agent
    print("Fetching active agent...")
    agent = get_active_agent(biz_id)
    print(f"Active Agent: {agent}")

    # 4. Check conditions
    if not agent:
        print("WARNING: Active agent is None!")
    if not meta_phone_number_id:
        print("WARNING: meta_phone_number_id is None or empty!")

    # 5. Generate message
    if agent:
        print("Generating welcome message...")
        try:
            welcome_text = generate_followup_message(customer, business, agent, 0)
            print(f"Generated Welcome Text: {welcome_text}")

            if welcome_text and meta_phone_number_id:
                print(f"Sending text message to {customer.get('phone')}...")
                send_result = send_text_message(customer['phone'], welcome_text, phone_number_id=meta_phone_number_id)
                print(f"Send Result: {send_result}")
            else:
                print("Skipped sending: either welcome_text or meta_phone_number_id is empty/None.")
        except Exception as e:
            print(f"Error generating or sending welcome message: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_welcome()
