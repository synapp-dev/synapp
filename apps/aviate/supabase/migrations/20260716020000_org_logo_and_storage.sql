-- Organisation branding: a logo URL on the org, plus a public storage bucket
-- to hold the images. Logos are served from the bucket's public URL, so no
-- extra storage.objects read policy is required; uploads go through the
-- service role (which bypasses RLS).

alter table public.organisations
  add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do update set public = excluded.public;
