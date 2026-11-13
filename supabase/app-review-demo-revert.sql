-- Run this in the Supabase SQL editor once the App Store review is over.
-- It removes the sample minyanim / demo account and restores the exact 1 km behaviour
-- of nearby_minyanim(). It is NOT in migrations/ on purpose: it must not run automatically.

SELECT cron.unschedule('refresh-app-review-demo');
DROP FUNCTION IF EXISTS public.refresh_app_review_demo();

-- Restore the original get_minyan_by_id() first, then drop what the demo added.
CREATE OR REPLACE FUNCTION public.get_minyan_by_id(_id uuid)
RETURNS SETOF minyanim
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.minyanim WHERE id = _id;
$$;

DELETE FROM public.chat_messages
 WHERE thread_id IN (SELECT t.id FROM public.chat_threads t
                       JOIN public.minyanim m ON m.id = t.minyan_id
                      WHERE m.message LIKE '[App Review demo]%');
DELETE FROM public.chat_thread_members
 WHERE thread_id IN (SELECT t.id FROM public.chat_threads t
                       JOIN public.minyanim m ON m.id = t.minyan_id
                      WHERE m.message LIKE '[App Review demo]%');
DELETE FROM public.chat_threads
 WHERE minyan_id IN (SELECT id FROM public.minyanim WHERE message LIKE '[App Review demo]%');
DELETE FROM public.minyan_participants
 WHERE minyan_id IN (SELECT id FROM public.minyanim WHERE message LIKE '[App Review demo]%');
DELETE FROM public.minyanim WHERE message LIKE '[App Review demo]%';
DELETE FROM public.user_blocks WHERE blocked_id = '00000000-0000-4000-8000-00000000d3a0';
DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-00000000d3a0';

CREATE OR REPLACE FUNCTION public.nearby_minyanim(lat double precision, lng double precision, radius_m integer DEFAULT 1000)
RETURNS SETOF minyanim
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT *
  FROM public.minyanim
  WHERE expires_at > now()
    AND (
      (
        type = 'street'
        AND extensions.ST_DWithin(
          location,
          extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography,
          radius_m
        )
      )
      OR (
        type = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND extensions.ST_DWithin(
          location,
          extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography,
          radius_m
        )
      )
    )
  ORDER BY created_at DESC;
$$;

-- Both original functions are back: the demo helpers can now go.
DROP FUNCTION IF EXISTS public._app_review_demo_relocate(public.minyanim, double precision, double precision);
DROP TABLE IF EXISTS public.app_review_demo_anchor;
