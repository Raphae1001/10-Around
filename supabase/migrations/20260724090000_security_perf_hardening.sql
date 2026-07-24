-- Pre-launch hardening pass (security advisor + performance advisor findings).
--
-- 1. Lock cron-only maintenance functions down so they can't be triggered
--    on demand via /rest/v1/rpc/... by anon/authenticated clients. pg_cron
--    calls these internally as the job owner, not through PostgREST, so
--    revoking anon/authenticated EXECUTE doesn't touch the schedule.
-- 2. Wrap auth.uid() in (select ...) across every RLS policy that used it
--    bare, so Postgres evaluates it once per statement instead of once per
--    row (see https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).
-- 3. Add covering indexes for FKs the performance advisor flagged as unindexed.

-- --- 1. Revoke public EXECUTE on cron-only functions ---
revoke execute on function public.cleanup_stale_presence() from anon, authenticated;
revoke execute on function public.cleanup_expired_minyanim() from anon, authenticated;
revoke execute on function public.trigger_due_confirmations() from anon, authenticated;
revoke execute on function public.check_minyan_confirmation() from anon, authenticated;

-- --- 2. RLS: (select auth.uid()) instead of bare auth.uid() ---

-- chat_messages
alter policy "Members can post in their threads as themselves" on public.chat_messages
  with check (((user_id = (select auth.uid())) and is_chat_member(thread_id)));
alter policy "Users can delete their own messages" on public.chat_messages
  using (user_id = (select auth.uid()));

-- chat_thread_members
alter policy "Members can self-join allowed threads" on public.chat_thread_members
  with check (((user_id = (select auth.uid())) and can_join_chat_thread(thread_id, (select auth.uid()))));
alter policy "Users can leave a thread" on public.chat_thread_members
  using (user_id = (select auth.uid()));
alter policy "Users can only add themselves to threads" on public.chat_thread_members
  with check (user_id = (select auth.uid()));
alter policy "Users can read their own membership row" on public.chat_thread_members
  using (user_id = (select auth.uid()));

-- content_reports
alter policy "Users can insert their own reports" on public.content_reports
  with check (reporter_id = (select auth.uid()));
alter policy "Users can read their own reports" on public.content_reports
  using (reporter_id = (select auth.uid()));

-- member_presence
alter policy "Users can delete own presence" on public.member_presence
  using ((select auth.uid()) = user_id);
alter policy "Users can insert own presence" on public.member_presence
  with check ((select auth.uid()) = user_id);
alter policy "Users can update own presence" on public.member_presence
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- realtime.messages
alter policy "Authenticated can read own topics" on realtime.messages
  using (
    (realtime.topic() = 'minyanim-live'::text)
    or (realtime.topic() = ('confirmations-'::text || ((select auth.uid()))::text))
    or (realtime.topic() ~~ 'chat-%'::text)
    or (realtime.topic() = 'chats-list'::text)
  );
alter policy "Authenticated can send own topics" on realtime.messages
  with check (
    (realtime.topic() = 'minyanim-live'::text)
    or (realtime.topic() = ('confirmations-'::text || ((select auth.uid()))::text))
    or (realtime.topic() ~~ 'chat-%'::text)
    or (realtime.topic() = 'chats-list'::text)
  );

-- minyan_confirmations
alter policy "Users can see their own confirmations" on public.minyan_confirmations
  using (
    ((select auth.uid()) = user_id)
    or (exists (select 1 from minyanim m where m.id = minyan_confirmations.minyan_id and m.creator_id = (select auth.uid())))
  );
alter policy "Users can update their own confirmations" on public.minyan_confirmations
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- minyan_participants
alter policy "Users can join minyanim themselves" on public.minyan_participants
  with check ((select auth.uid()) = user_id);
alter policy "Users can leave minyanim themselves" on public.minyan_participants
  using ((select auth.uid()) = user_id);

-- minyanim
alter policy "Creators can delete their minyanim" on public.minyanim
  using ((select auth.uid()) = creator_id);
alter policy "Creators can update their minyanim" on public.minyanim
  using ((select auth.uid()) = creator_id) with check ((select auth.uid()) = creator_id);
alter policy "Users can create their own minyanim" on public.minyanim
  with check ((select auth.uid()) = creator_id);

-- profiles
alter policy "Users can insert their own profile" on public.profiles
  with check ((select auth.uid()) = id);
alter policy "Users can update their own profile" on public.profiles
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- travel_presence
alter policy "Delete own travel presence" on public.travel_presence
  using (user_id = (select auth.uid()));
alter policy "Insert own travel presence" on public.travel_presence
  with check (user_id = (select auth.uid()));
alter policy "Read own travel presence" on public.travel_presence
  using (user_id = (select auth.uid()));
alter policy "Update own travel presence" on public.travel_presence
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- user_notifications
alter policy "Users can mark their own notifications read" on public.user_notifications
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users can read their own notifications" on public.user_notifications
  using ((select auth.uid()) = user_id);

-- user_push_tokens
alter policy "Owner can delete own push token" on public.user_push_tokens
  using ((select auth.uid()) = user_id);
alter policy "Owner can insert own push token" on public.user_push_tokens
  with check ((select auth.uid()) = user_id);
alter policy "Owner can read own push token" on public.user_push_tokens
  using ((select auth.uid()) = user_id);
alter policy "Owner can update own push token" on public.user_push_tokens
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- --- 3. Missing FK covering indexes ---
create index if not exists chat_messages_user_id_idx on public.chat_messages (user_id);
create index if not exists chat_thread_members_user_id_idx on public.chat_thread_members (user_id);
create index if not exists content_reports_message_id_idx on public.content_reports (message_id);
create index if not exists content_reports_reported_user_id_idx on public.content_reports (reported_user_id);
create index if not exists content_reports_thread_id_idx on public.content_reports (thread_id);
create index if not exists minyan_participants_user_id_idx on public.minyan_participants (user_id);
create index if not exists minyanim_creator_id_idx on public.minyanim (creator_id);
create index if not exists push_notification_log_minyan_id_idx on public.push_notification_log (minyan_id);
create index if not exists user_notifications_minyan_id_idx on public.user_notifications (minyan_id);
