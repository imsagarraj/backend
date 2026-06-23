-- Migration tracking table + auth user lookup RPC
-- Run in Supabase SQL Editor

-- ===== MIG-1: Migration tracking table =====
CREATE TABLE IF NOT EXISTS _migrations (
  id serial PRIMARY KEY,
  filename text NOT NULL UNIQUE,
  applied_at timestamptz DEFAULT now(),
  checksum text
);

-- ===== MIG-4: auth user lookup via RPC (service_role only) =====
-- Replaces seed.py's broken supabase.table('auth.users') query
CREATE OR REPLACE FUNCTION lookup_auth_user_by_email(target_email text)
RETURNS TABLE (id uuid, email text, created_at timestamptz)
SECURITY DEFINER
SET search_path = auth
AS $$
  SELECT id, email, created_at FROM auth.users WHERE email = target_email LIMIT 1;
$$ LANGUAGE sql;

REVOKE EXECUTE ON FUNCTION lookup_auth_user_by_email(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION lookup_auth_user_by_email(text) TO service_role;
