-- Phase 1: Relationship Engine
-- Run this in Supabase Dashboard -> SQL Editor

ALTER TABLE customers ADD COLUMN IF NOT EXISTS conversation_state JSONB DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS relationship_score INT DEFAULT 0;

-- Phase 2 (future): Run later when implementing phase 2
-- ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS brand_personality TEXT DEFAULT 'friendly_dentist';
-- 
-- CREATE TABLE IF NOT EXISTS relationship_timeline (
--     id SERIAL PRIMARY KEY,
--     customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
--     event_type TEXT NOT NULL,
--     detail JSONB,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );
-- 
-- ALTER TABLE messages ADD COLUMN IF NOT EXISTS sentiment TEXT;
