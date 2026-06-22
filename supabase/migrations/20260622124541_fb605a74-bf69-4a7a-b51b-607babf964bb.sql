
-- Enable PostGIS for geo queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  language TEXT DEFAULT 'en',
  push_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ MINYANIM ============
CREATE TYPE public.minyan_type AS ENUM ('street', 'airport', 'hotel', 'travel');
CREATE TYPE public.minyan_prayer AS ENUM ('shacharit', 'mincha', 'arvit', 'maariv', 'other');

CREATE TABLE public.minyanim (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.minyan_type NOT NULL,
  prayer public.minyan_prayer NOT NULL DEFAULT 'mincha',
  nusach TEXT,
  message TEXT,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  -- For street/airport: live now. For hotel/travel: scheduled.
  is_live BOOLEAN NOT NULL DEFAULT true,
  scheduled_at TIMESTAMPTZ,
  trip_start_date DATE,
  trip_end_date DATE,
  present_count INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '2 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX minyanim_location_idx ON public.minyanim USING GIST (location);
CREATE INDEX minyanim_scheduled_idx ON public.minyanim (scheduled_at);
CREATE INDEX minyanim_expires_idx ON public.minyanim (expires_at);

-- Trigger to keep `location` in sync with lat/lng
CREATE OR REPLACE FUNCTION public.set_minyan_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_minyan_location
  BEFORE INSERT OR UPDATE ON public.minyanim
  FOR EACH ROW EXECUTE FUNCTION public.set_minyan_location();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.minyanim TO authenticated;
GRANT ALL ON public.minyanim TO service_role;

ALTER TABLE public.minyanim ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Minyanim are viewable by authenticated users"
  ON public.minyanim FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create their own minyanim"
  ON public.minyanim FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their minyanim"
  ON public.minyanim FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their minyanim"
  ON public.minyanim FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- ============ PARTICIPANTS ============
CREATE TABLE public.minyan_participants (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  minyan_id UUID NOT NULL REFERENCES public.minyanim(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (minyan_id, user_id)
);

CREATE INDEX minyan_participants_minyan_idx ON public.minyan_participants (minyan_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.minyan_participants TO authenticated;
GRANT ALL ON public.minyan_participants TO service_role;

ALTER TABLE public.minyan_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants viewable by authenticated users"
  ON public.minyan_participants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can join minyanim themselves"
  ON public.minyan_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave minyanim themselves"
  ON public.minyan_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Keep present_count in sync
CREATE OR REPLACE FUNCTION public.sync_minyan_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.minyanim
      SET present_count = (SELECT COUNT(*) FROM public.minyan_participants WHERE minyan_id = NEW.minyan_id)
      WHERE id = NEW.minyan_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.minyanim
      SET present_count = (SELECT COUNT(*) FROM public.minyan_participants WHERE minyan_id = OLD.minyan_id)
      WHERE id = OLD.minyan_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_minyan_count
  AFTER INSERT OR DELETE ON public.minyan_participants
  FOR EACH ROW EXECUTE FUNCTION public.sync_minyan_count();

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.minyanim;
ALTER PUBLICATION supabase_realtime ADD TABLE public.minyan_participants;

-- ============ GEO QUERY HELPER ============
CREATE OR REPLACE FUNCTION public.nearby_minyanim(lat DOUBLE PRECISION, lng DOUBLE PRECISION, radius_m INTEGER DEFAULT 1000)
RETURNS SETOF public.minyanim
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT *
  FROM public.minyanim
  WHERE expires_at > now()
    AND (
      -- Live street/airport within radius
      (type IN ('street', 'airport') AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_m))
      OR
      -- Hotel/travel scheduled in advance: always visible
      (type IN ('hotel', 'travel'))
    )
  ORDER BY created_at DESC;
$$;
