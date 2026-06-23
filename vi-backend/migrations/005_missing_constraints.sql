-- Missing constraints migration
-- CON-1: unique phone per business, CON-2: FK cascade, CON-3: CHECK, CON-4: soft delete
-- Run in Supabase SQL Editor

-- ===== CON-1: unique(phone, business_id) =====
-- Clean duplicates first (keep the most recently created row)
DELETE FROM customers a
USING customers b
WHERE a.phone = b.phone
  AND a.business_id = b.business_id
  AND a.id < b.id;

ALTER TABLE customers ADD CONSTRAINT uq_customers_phone_business UNIQUE (phone, business_id);

-- ===== CON-2: active_agent_id FK with SET NULL =====
ALTER TABLE business_profiles DROP CONSTRAINT IF EXISTS fk_business_profiles_active_agent;
ALTER TABLE business_profiles ADD CONSTRAINT fk_business_profiles_active_agent
  FOREIGN KEY (active_agent_id) REFERENCES agents(id) ON DELETE SET NULL;

-- ===== CON-3: CHECK constraints on status fields =====
ALTER TABLE customers ADD CONSTRAINT chk_customers_status
  CHECK (status IN ('active', 'paused', 'completed', 'inactive', 'blacklisted'));

ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_status
  CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'));

ALTER TABLE messages ADD CONSTRAINT chk_messages_direction
  CHECK (direction IN ('received', 'sent'));

ALTER TABLE messages ADD CONSTRAINT chk_messages_status
  CHECK (status IN ('received', 'sent', 'failed'));

ALTER TABLE follow_up_sequences ADD CONSTRAINT chk_followup_status
  CHECK (status IN ('pending', 'completed', 'skipped', 'cancelled'));

ALTER TABLE message_queue ADD CONSTRAINT chk_message_queue_stage
  CHECK (stage IN (
    'pending_schedule', 'pending_ai_gen', 'ready_to_send',
    'sending', 'sent', 'failed', 'dead', 'cancelled'
  ));

-- ===== CON-4: soft delete columns =====
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE message_queue ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ===== VERIFY =====
SELECT table_name, constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('customers','campaigns','messages','follow_up_sequences','message_queue','business_profiles')
ORDER BY table_name, constraint_type;
