-- Per-server SFTP/RCON creds for the Push-to-live CS2 plugin deploy.
-- RLS denies ALL client access; only the server-side service role reads secrets.

create table if not exists public.redline_deploy_targets (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  redline_server_id text,
  sftp_host text not null,
  sftp_port integer not null default 2022,
  sftp_user text not null,
  sftp_password text not null,
  rcon_host text not null,
  rcon_port integer not null default 27015,
  rcon_password text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.redline_deploy_targets is
  'Per-server SFTP/RCON creds for the Push-to-live CS2 plugin deploy. RLS denies ALL client access; only the server-side service role reads secrets.';

-- At most one active target.
create unique index if not exists redline_deploy_targets_one_active
  on public.redline_deploy_targets (is_active) where is_active;

-- RLS on, with NO policies → anon/authenticated get nothing. The service role
-- (server-side only) bypasses RLS, so secrets never reach a browser client.
alter table public.redline_deploy_targets enable row level security;
alter table public.redline_deploy_targets force row level security;
