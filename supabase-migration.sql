-- Run this in your Supabase SQL Editor to create tables and policies

-- ============================================================
-- ADMIN USERS TABLE (for DB-backed admin access control)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only allow service_role key (backend) to access admin_users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Admin users service role only' AND tablename='admin_users') THEN
    CREATE POLICY "Admin users service role only" ON admin_users USING (true);
  END IF;
END $$;

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  gender TEXT,
  dob DATE,
  city TEXT,
  product TEXT NOT NULL,
  purchase_date DATE,
  order_value NUMERIC,
  order_id TEXT,
  notes TEXT,
  stage TEXT DEFAULT 'Day 1',
  last_contact TIMESTAMPTZ,
  status TEXT DEFAULT 'Pending',
  start_sequence BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can manage their own customers' AND tablename='customers') THEN
    CREATE POLICY "Users can manage their own customers" ON customers USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- FOLLOW-UP SEQUENCES TABLE (randomized monthly follow-ups)
-- ============================================================
CREATE TABLE IF NOT EXISTS follow_up_sequences (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  touch_number INT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_follow_up_due ON follow_up_sequences(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_customer ON follow_up_sequences(customer_id);

-- Normalize existing phone numbers (strip +, spaces, dashes)
UPDATE customers SET phone = regexp_replace(phone, '[+\s\-\(\)]', '', 'g') WHERE phone ~ '[\+\s\-\(\)]';

-- ============================================================
-- BUSINESS PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS business_profiles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  business_name TEXT,
  business_type TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  gst TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  website TEXT,
  description TEXT,
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  owner_designation TEXT,
  owner_dob DATE,
  owner_gender TEXT,
  working_days TEXT[] DEFAULT '{Monday,Tuesday,Wednesday,Thursday,Friday}',
  opening_time TIME DEFAULT '09:00',
  closing_time TIME DEFAULT '18:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can manage their own business profile' AND tablename='business_profiles') THEN
    CREATE POLICY "Users can manage their own business profile" ON business_profiles USING (auth.uid() = user_id);
  END IF;
END $$;
