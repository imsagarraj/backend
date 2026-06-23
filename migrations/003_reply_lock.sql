ALTER TABLE customers ADD COLUMN IF NOT EXISTS reply_lock timestamptz;
