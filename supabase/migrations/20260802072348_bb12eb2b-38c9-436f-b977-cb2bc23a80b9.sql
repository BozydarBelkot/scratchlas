CREATE TABLE public.trips (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  start_date text,
  end_date text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own trips" ON public.trips FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.places (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL,
  country text NOT NULL,
  status text NOT NULL,
  lat double precision,
  lng double precision,
  date text,
  trip_id text,
  notes text,
  created_at bigint NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.places TO authenticated;
GRANT ALL ON public.places TO service_role;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own places" ON public.places FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.place_media (
  id text PRIMARY KEY,
  place_id text NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  url text NOT NULL,
  kind text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_media TO authenticated;
GRANT ALL ON public.place_media TO service_role;
ALTER TABLE public.place_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage media of their own places" ON public.place_media FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.user_id = auth.uid()));

CREATE INDEX places_user_id_idx ON public.places (user_id);
CREATE INDEX trips_user_id_idx ON public.trips (user_id);
CREATE INDEX place_media_place_id_idx ON public.place_media (place_id);