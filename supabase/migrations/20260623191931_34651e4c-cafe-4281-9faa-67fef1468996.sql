
CREATE OR REPLACE FUNCTION public.cancel_my_minyan(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row public.minyanim%ROWTYPE;
  _start timestamptz;
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

  _start := COALESCE(_row.scheduled_at, _row.created_at);
  IF _start - now() < interval '15 minutes' THEN
    RAISE EXCEPTION 'too late to cancel — must be at least 15 minutes before start';
  END IF;

  DELETE FROM public.minyanim WHERE id = _id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_my_minyan(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_minyan(uuid) TO authenticated;
