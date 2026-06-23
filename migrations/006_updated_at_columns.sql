-- Add updated_at columns to frequently mutated tables
-- Run in Supabase SQL Editor

ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Auto-set updated_at on change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop & recreate to make them idempotent
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_agents_updated_at ON agents;
CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_messages_updated_at ON messages;
CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Initialize existing rows
UPDATE customers SET updated_at = created_at WHERE updated_at IS NULL AND created_at IS NOT NULL;
UPDATE customers SET updated_at = now() WHERE updated_at IS NULL;
UPDATE agents SET updated_at = now() WHERE updated_at IS NULL;
UPDATE messages SET updated_at = timestamp WHERE updated_at IS NULL AND timestamp IS NOT NULL;
UPDATE messages SET updated_at = now() WHERE updated_at IS NULL;
