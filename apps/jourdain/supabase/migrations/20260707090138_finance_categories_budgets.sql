-- Finance: transaction categories, user categorisation rules, budgets.
-- Follows the bank_* pattern: user-owned rows, RLS SELECT policies,
-- writes happen server-side via the service role.

ALTER TABLE public.bank_transactions ADD COLUMN IF NOT EXISTS category text;

CREATE TABLE IF NOT EXISTS public.transaction_category_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern text NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  monthly_limit numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

CREATE INDEX IF NOT EXISTS transaction_category_rules_user_idx
  ON public.transaction_category_rules (user_id);

ALTER TABLE public.transaction_category_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transaction_category_rules_select_own ON public.transaction_category_rules;
CREATE POLICY transaction_category_rules_select_own ON public.transaction_category_rules
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS budgets_select_own ON public.budgets;
CREATE POLICY budgets_select_own ON public.budgets
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());
