-- Radar callout zones per map (polygon rings in normalized 0–1 JSON space).
CREATE TABLE IF NOT EXISTS public.map_callouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  map_id uuid NOT NULL REFERENCES public.maps (id) ON DELETE CASCADE,
  slug varchar(128) NOT NULL,
  label text NOT NULL,
  polygon_ring jsonb NOT NULL,
  priority integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT map_callouts_map_id_slug_key UNIQUE (map_id, slug)
);

CREATE INDEX IF NOT EXISTS map_callouts_map_id_idx ON public.map_callouts USING btree (map_id);
