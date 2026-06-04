-- Run this in your Supabase SQL Editor to create the customers table
CREATE TABLE customers (
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

CREATE POLICY "Users can manage their own customers"
  ON customers
  USING (auth.uid() = user_id);

-- Business profiles table
CREATE TABLE business_profiles (
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

CREATE POLICY "Users can manage their own business profile"
  ON business_profiles
  USING (auth.uid() = user_id);
