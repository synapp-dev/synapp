-- Imported bank data (OFX import from CommBank NetBank exports).
-- User-owned data: RLS with own-row SELECT policies. Writes happen server-side
-- via the service role in the import route. Transactions dedupe on FITID.

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  account_type text,
  bsb text,
  currency text,
  balance numeric,
  balance_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, external_id)
);

CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_external_id text NOT NULL,
  fit_id text NOT NULL,
  posted_date date,
  amount numeric NOT NULL,
  type text,
  description text NOT NULL,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_external_id, fit_id)
);

CREATE INDEX IF NOT EXISTS bank_transactions_user_account_date_idx
  ON public.bank_transactions (user_id, account_external_id, posted_date DESC);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_accounts_select_own ON public.bank_accounts;
CREATE POLICY bank_accounts_select_own ON public.bank_accounts
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS bank_transactions_select_own ON public.bank_transactions;
CREATE POLICY bank_transactions_select_own ON public.bank_transactions
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());
