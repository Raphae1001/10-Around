-- Bug found while testing the review demo: answering the "Did you make it to the minyan?"
-- prompt always failed for participants ("permission denied for table profiles") because
-- answer_confirmation() ran with the caller's rights. It now runs as SECURITY DEFINER and only
-- ever touches the caller's own row (auth.uid()). The trust score changes only on the first answer.
-- Note: the profiles trigger protect_profile_columns() still resets trust_score when the caller
-- is the profile owner, so the score itself is not changed by this function (pre-existing design).

CREATE OR REPLACE FUNCTION public.answer_confirmation(_minyan_id uuid, _answer confirmation_answer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role public.confirmation_role;
  _uid uuid := auth.uid();
  _prev public.confirmation_answer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT answer INTO _prev FROM public.minyan_confirmations
   WHERE minyan_id = _minyan_id AND user_id = _uid;

  UPDATE public.minyan_confirmations
     SET answer = _answer, answered_at = now()
   WHERE minyan_id = _minyan_id AND user_id = _uid
   RETURNING role INTO _role;

  IF _role = 'participant' AND _prev IS NULL THEN
    IF _answer = 'yes' THEN
      UPDATE public.profiles SET trust_score = LEAST(trust_score + 2, 999) WHERE id = _uid;
    ELSE
      UPDATE public.profiles SET trust_score = GREATEST(trust_score - 5, 0) WHERE id = _uid;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.answer_confirmation(uuid, confirmation_answer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_confirmation(uuid, confirmation_answer) TO authenticated;
