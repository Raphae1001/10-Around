-- Chat uses postgres_changes on channels `chat-<threadId>` and `chats-list`.
-- Extend realtime.messages topic allowlist (row data still gated by chat_messages RLS).
DROP POLICY IF EXISTS "Authenticated can read own topics" ON realtime.messages;
CREATE POLICY "Authenticated can read own topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() = 'minyanim-live'
    OR realtime.topic() = ('confirmations-' || auth.uid()::text)
    OR realtime.topic() LIKE 'chat-%'
    OR realtime.topic() = 'chats-list'
  );

DROP POLICY IF EXISTS "Authenticated can send own topics" ON realtime.messages;
CREATE POLICY "Authenticated can send own topics"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.topic() = 'minyanim-live'
    OR realtime.topic() = ('confirmations-' || auth.uid()::text)
    OR realtime.topic() LIKE 'chat-%'
    OR realtime.topic() = 'chats-list'
  );
