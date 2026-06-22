
-- Enforce server-side limits on minyanim insert/update
CREATE OR REPLACE FUNCTION public.enforce_minyan_constraints()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _max_expiry timestamptz;
BEGIN
  -- Max lifetime depends on type: scheduled (hotel/travel) up to 30 days, live (street/airport) up to 6h
  IF NEW.type IN ('hotel','travel') THEN
    _max_expiry := now() + interval '30 days';
  ELSE
    _max_expiry := now() + interval '6 hours';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Force creator to be the caller
    IF NEW.creator_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'creator_id must match auth.uid()';
    END IF;
    -- Reset attendance to 0 on insert (sync trigger maintains it)
    NEW.present_count := 0;
    -- Clamp expires_at
    IF NEW.expires_at IS NULL OR NEW.expires_at > _max_expiry THEN
      NEW.expires_at := _max_expiry;
    END IF;
    IF NEW.expires_at <= now() THEN
      RAISE EXCEPTION 'expires_at must be in the future';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Lock down sensitive fields against client tampering
    NEW.creator_id := OLD.creator_id;
    NEW.present_count := OLD.present_count;
    -- Allow extending/shortening expiry only within max bound
    IF NEW.expires_at IS NULL THEN
      NEW.expires_at := OLD.expires_at;
    ELSIF NEW.expires_at > _max_expiry THEN
      NEW.expires_at := _max_expiry;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_minyan_constraints_trg ON public.minyanim;
CREATE TRIGGER enforce_minyan_constraints_trg
BEFORE INSERT OR UPDATE ON public.minyanim
FOR EACH ROW EXECUTE FUNCTION public.enforce_minyan_constraints();
