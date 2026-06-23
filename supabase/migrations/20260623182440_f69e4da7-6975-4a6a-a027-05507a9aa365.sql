
ALTER TABLE public.profiles ALTER COLUMN trust_score SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.get_my_stats()
RETURNS TABLE(
  minyanim_count int,
  completed_count int,
  streak_days int,
  stars numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _yes int;
  _total int;
BEGIN
  IF _uid IS NULL THEN
    minyanim_count := 0; completed_count := 0; streak_days := 0; stars := 0;
    RETURN NEXT; RETURN;
  END IF;

  SELECT COUNT(*) INTO minyanim_count
    FROM public.minyan_participants WHERE user_id = _uid;

  SELECT COUNT(*) INTO completed_count
    FROM public.minyan_participants p
    JOIN public.minyanim m ON m.id = p.minyan_id
    WHERE p.user_id = _uid AND m.present_count >= 10;

  WITH days AS (
    SELECT DISTINCT (joined_at AT TIME ZONE 'UTC')::date AS d
    FROM public.minyan_participants WHERE user_id = _uid
  ), ranked AS (
    SELECT d, (CURRENT_DATE - d) AS diff,
           ROW_NUMBER() OVER (ORDER BY d DESC) - 1 AS rn
    FROM days
  )
  SELECT COALESCE(COUNT(*), 0) INTO streak_days
    FROM ranked WHERE diff = rn;

  SELECT
    COUNT(*) FILTER (WHERE answer = 'yes'),
    COUNT(*) FILTER (WHERE answer IS NOT NULL)
  INTO _yes, _total
  FROM public.minyan_confirmations WHERE user_id = _uid;

  stars := CASE WHEN _total = 0 THEN 0 ELSE ROUND((_yes::numeric / _total) * 5, 1) END;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_recent_participations(_limit int DEFAULT 5)
RETURNS TABLE(
  minyan_id uuid,
  prayer text,
  address text,
  joined_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.prayer::text, m.address, p.joined_at
  FROM public.minyan_participants p
  JOIN public.minyanim m ON m.id = p.minyan_id
  WHERE p.user_id = auth.uid()
  ORDER BY p.joined_at DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_recent_participations(int) TO authenticated;
