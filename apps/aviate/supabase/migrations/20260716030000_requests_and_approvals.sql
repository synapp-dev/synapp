-- Aviate requests & approvals framework
--
-- One generic workflow that replaces the station's paper forms (leave, shift/
-- line swaps, higher-duty, cashout, pay query, change-of-details, uniforms).
-- Every form is one `requests` row with a jsonb payload; the approval chain is
-- materialised as `request_approvals` steps at submit time; `request_events`
-- is the audit trail. Attachments (certs, payslips, ID evidence) hang off the
-- request. Fields specific to each form live in the payload, so adding a new
-- form is a config change, not a schema change.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type request_kind as enum (
  'leave_application',
  'leave_request',
  'shift_swap',
  'line_swap',
  'higher_duty',
  'leave_cashout',
  'pay_query',
  'change_of_details',
  'uniform_order'
);

create type request_status as enum (
  'draft',
  'submitted',
  'in_review',
  'approved',
  'declined',
  'cancelled',
  'actioned'
);

-- The roles that sign off a step. `requestee` is the counterparty on a swap.
create type approval_role as enum (
  'requestee',
  'supervisor',
  'allocator',
  'manager',
  'dept_manager',
  'station_manager',
  'payroll',
  'hr'
);

create type approval_decision as enum (
  'pending',
  'approved',
  'declined',
  'skipped'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  kind request_kind not null,
  -- The employee the request is *about* / raised by. Nullable so a manager can
  -- raise a request before the workforce record is linked, but normally set.
  employee_id uuid references employees (id) on delete set null,
  station_id uuid references stations (id) on delete set null,
  department_id uuid references departments (id) on delete set null,
  reference text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  status request_status not null default 'submitted',
  -- 1-based index of the approval step currently awaiting a decision.
  current_step integer not null default 1,
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index requests_org_status_idx on requests (org_id, status);
create index requests_employee_idx on requests (employee_id);
create index requests_kind_idx on requests (org_id, kind);

-- A per-request human reference like MEL-LEAVE-0007, unique inside an org.
create unique index requests_reference_idx on requests (org_id, reference);

create table request_approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  request_id uuid not null references requests (id) on delete cascade,
  step_order integer not null,
  role approval_role not null,
  label text not null,
  -- The specific employee expected to act, when known (e.g. the swap
  -- counterparty). Null means "anyone holding this role may action it".
  assignee_employee_id uuid references employees (id) on delete set null,
  decision approval_decision not null default 'pending',
  decided_by uuid references profiles (id) on delete set null,
  decided_at timestamptz,
  signature_name text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, step_order)
);

create index request_approvals_request_idx on request_approvals (request_id, step_order);
create index request_approvals_assignee_idx on request_approvals (assignee_employee_id);

create table request_attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  request_id uuid not null references requests (id) on delete cascade,
  file_name text not null,
  storage_path text,
  content_type text,
  size_bytes integer,
  uploaded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index request_attachments_request_idx on request_attachments (request_id);

create type request_event_kind as enum (
  'created',
  'submitted',
  'approved',
  'declined',
  'commented',
  'cancelled',
  'actioned'
);

create table request_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  request_id uuid not null references requests (id) on delete cascade,
  kind request_event_kind not null,
  actor_id uuid references profiles (id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index request_events_request_idx on request_events (request_id, created_at);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse set_updated_at from the foundation migration)
-- ---------------------------------------------------------------------------

create trigger requests_set_updated_at
  before update on requests
  for each row execute function set_updated_at();

create trigger request_approvals_set_updated_at
  before update on request_approvals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- True when the signed-in user is the employee the request belongs to.
create or replace function owns_employee(target_employee uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from employees
    where id = target_employee and profile_id = (select auth.uid())
  );
$$;

-- True when the signed-in user is named as the assignee on any step of a
-- request (e.g. the swap counterparty), so they can see and action it.
create or replace function is_request_assignee(target_request uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from request_approvals ra
    join employees e on e.id = ra.assignee_employee_id
    where ra.request_id = target_request
      and e.profile_id = (select auth.uid())
  );
$$;

-- Central visibility rule reused by the child tables.
create or replace function can_view_request(target_request uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from requests r
    where r.id = target_request
      and (
        is_org_manager(r.org_id)
        or owns_employee(r.employee_id)
        or is_request_assignee(r.id)
      )
  );
$$;

alter table requests enable row level security;
alter table request_approvals enable row level security;
alter table request_attachments enable row level security;
alter table request_events enable row level security;

-- requests: owner, named approver, or any org manager may see it.
create policy "view own or assigned requests" on requests
  for select using (
    is_org_manager(org_id)
    or owns_employee(employee_id)
    or is_request_assignee(id)
  );

-- Employees raise their own; managers may raise on anyone's behalf.
create policy "raise own requests" on requests
  for insert with check (
    is_org_member(org_id)
    and (is_org_manager(org_id) or owns_employee(employee_id))
  );

-- Managers or a named approver may progress a request; owners may cancel via API.
create policy "progress requests" on requests
  for update using (
    is_org_manager(org_id) or is_request_assignee(id) or owns_employee(employee_id)
  ) with check (
    is_org_manager(org_id) or is_request_assignee(id) or owns_employee(employee_id)
  );

create policy "managers delete requests" on requests
  for delete using (is_org_manager(org_id));

-- Child tables inherit the parent request's visibility.
create policy "view request approvals" on request_approvals
  for select using (can_view_request(request_id));
create policy "act on request approvals" on request_approvals
  for insert with check (is_org_member(org_id) and can_view_request(request_id));
create policy "update request approvals" on request_approvals
  for update using (
    is_org_manager(org_id)
    or (assignee_employee_id is not null and owns_employee(assignee_employee_id))
  ) with check (
    is_org_manager(org_id)
    or (assignee_employee_id is not null and owns_employee(assignee_employee_id))
  );

create policy "view request attachments" on request_attachments
  for select using (can_view_request(request_id));
create policy "add request attachments" on request_attachments
  for insert with check (is_org_member(org_id) and can_view_request(request_id));

create policy "view request events" on request_events
  for select using (can_view_request(request_id));
create policy "add request events" on request_events
  for insert with check (is_org_member(org_id) and can_view_request(request_id));
