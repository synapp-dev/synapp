-- Todoist-style priority (1 = urgent ... 4 = default) and life-domain
-- categories linking tasks to the sidebar modules. Multiple domains allowed.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 4
    CONSTRAINT tasks_priority_range CHECK (priority BETWEEN 1 AND 4);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS domains text[] NOT NULL DEFAULT '{}'::text[]
    CONSTRAINT tasks_domains_allowed CHECK (
      domains <@ ARRAY['identity','health','work','social','finance']::text[]
    );
