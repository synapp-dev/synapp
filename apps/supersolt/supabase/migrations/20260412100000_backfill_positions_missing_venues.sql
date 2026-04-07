-- Venues created after the original positions seed had no roster stations.
-- Insert the same default set for any venue that has zero active positions.

INSERT INTO public.positions (organisation_id, venue_id, slug, display_name, sort_order)
SELECT v.organisation_id, v.id, s.slug, s.display_name, s.sort_order
FROM public.venues v
CROSS JOIN (
  VALUES
    ('chef', 'Chef', 10),
    ('sous', 'Sous', 20),
    ('cdp', 'CDP', 30),
    ('foh', 'FOH', 40),
    ('bar', 'Bar', 50),
    ('host', 'Host', 60),
    ('manager', 'Manager', 70)
) AS s(slug, display_name, sort_order)
WHERE v.archived_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.positions p
    WHERE p.venue_id = v.id
      AND p.archived_at IS NULL
  );
