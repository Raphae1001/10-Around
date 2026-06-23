CREATE OR REPLACE FUNCTION public.cancel_my_minyan(_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row public.minyanim%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO _row FROM public.minyanim WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'minyan not found';
  END IF;

  IF _row.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'only the organizer can cancel this minyan';
  END IF;

  -- Scheduled minyans: protect joiners — cannot cancel less than 20 min before start.
  -- Live minyans (no scheduled_at): organizer can always cancel.
  IF _row.scheduled_at IS NOT NULL AND _row.scheduled_at - now() < interval '20 minutes' THEN
    RAISE EXCEPTION 'too late to cancel — must be at least 20 minutes before start';
  END IF;

  DELETE FROM public.minyanim WHERE id = _id;
END;
$function$;