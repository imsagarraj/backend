-- Fix missing/cross-tenant RLS policies
-- Copy-paste the entire file and run in Supabase SQL Editor

-- ===== BLOCK 1: follow_up_sequences =====
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their follow-up sequences" ON follow_up_sequences;
CREATE POLICY "Users can manage their follow-up sequences" ON follow_up_sequences
  USING (auth.uid() = (SELECT user_id FROM business_profiles WHERE id = business_id));

-- ===== BLOCK 2: campaigns =====
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their campaigns" ON campaigns;
CREATE POLICY "Users can manage their campaigns" ON campaigns
  USING (auth.uid() = (SELECT user_id FROM business_profiles WHERE id = business_id));

-- ===== BLOCK 3: messages =====
DROP POLICY IF EXISTS "Messages service access" ON messages;
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
CREATE POLICY "Users can view their messages" ON messages
  USING (auth.uid() = (SELECT user_id FROM business_profiles WHERE id = business_id));

-- ===== BLOCK 4: conversation_history =====
DROP POLICY IF EXISTS "Conversation history service access" ON conversation_history;
DROP POLICY IF EXISTS "Users can view their conversation history" ON conversation_history;
CREATE POLICY "Users can view their conversation history" ON conversation_history
  USING (
    customer_id IN (
      SELECT c.id FROM customers c
      JOIN business_profiles b ON c.business_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );

-- ===== BLOCK 5: message_queue =====
DROP POLICY IF EXISTS "Message queue service access" ON message_queue;
DROP POLICY IF EXISTS "Users can view their message queue" ON message_queue;
CREATE POLICY "Users can view their message queue" ON message_queue
  USING (auth.uid() = (SELECT user_id FROM business_profiles WHERE id = business_id));

-- ===== BLOCK 6: verify =====
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('follow_up_sequences','campaigns','messages','conversation_history','message_queue')
ORDER BY tablename;
