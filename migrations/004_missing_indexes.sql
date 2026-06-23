-- Missing indexes for hot-path queries
-- Run in Supabase SQL Editor

CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_phone_business ON customers(phone, business_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

CREATE INDEX IF NOT EXISTS idx_messages_business_id ON messages(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON messages(customer_id);

CREATE INDEX IF NOT EXISTS idx_conversation_history_customer_id ON conversation_history(customer_id);

CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_meta_phone ON business_profiles(meta_phone_number_id);
