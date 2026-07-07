alter table public.gym_session_exercises
  add column if not exists warmup_sets smallint,
  add column if not exists working_sets smallint,
  add column if not exists drop_sets smallint,
  add column if not exists rest_seconds integer;

comment on column public.gym_session_exercises.warmup_sets is 'Planned warm-up set count chosen in the start wizard (null = app default)';
comment on column public.gym_session_exercises.working_sets is 'Planned working set count chosen in the start wizard (null = app default)';
comment on column public.gym_session_exercises.drop_sets is 'Planned drop set count chosen in the start wizard (null = app default)';
comment on column public.gym_session_exercises.rest_seconds is 'Planned rest between sets in seconds (null = per-kind defaults)';
