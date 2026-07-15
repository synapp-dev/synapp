-- Test-mode venues mirror another venue's Square/Xero connection instead of
-- holding their own OAuth grant. Mirror rows keep placeholder tokens; the
-- connection loaders delegate token reads (and refresh writes) to the source
-- venue's row so a single token-refresh chain is preserved.
alter table venue_square_connections
  add column mirror_source_venue_id uuid references venues(id) on delete cascade;

alter table venue_xero_connections
  add column mirror_source_venue_id uuid references venues(id) on delete cascade;
