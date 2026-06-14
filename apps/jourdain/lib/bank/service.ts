import { createAdminClient } from "@/utils/supabase/admin";
import { parseOfx } from "@/lib/import/ofx";

export type ImportSummary = {
  accounts: number;
  inserted: number;
  duplicates: number;
};

export type BankAccount = {
  externalId: string;
  name: string;
  accountType: string | null;
  bsb: string | null;
  currency: string | null;
  balance: number | null;
  balanceDate: string | null;
  /** When this account was last imported (bank_accounts.updated_at). */
  updatedAt: string | null;
};

export type BankTransaction = {
  id: string;
  fitId: string;
  date: string | null;
  amount: number;
  type: string | null;
  description: string;
  memo: string | null;
};

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

// OFX carries no account name, so derive a friendly one from type + last digits
// (e.g. "Savings ••7096"). The user can rename later if we add that.
function friendlyName(accountType: string | null, externalId: string): string {
  const last4 = externalId.slice(-4);
  const label = accountType ? titleCase(accountType) : "Account";
  return last4 ? `${label} ••${last4}` : label;
}

/** Parse an OFX export and upsert accounts + new transactions for the user. */
export async function importOfx(
  userId: string,
  content: string
): Promise<ImportSummary> {
  const statements = parseOfx(content);
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  let accounts = 0;
  let inserted = 0;
  let duplicates = 0;

  for (const statement of statements) {
    const externalId = statement.accountId;
    if (!externalId) continue;

    const { error: accountError } = await admin.from("bank_accounts").upsert(
      {
        user_id: userId,
        external_id: externalId,
        name: friendlyName(statement.accountType, externalId),
        account_type: statement.accountType,
        bsb: statement.bankId,
        currency: statement.currency,
        balance: statement.balance,
        balance_date: statement.balanceDate,
        updated_at: nowIso,
      },
      { onConflict: "user_id,external_id" }
    );
    if (accountError) throw new Error(accountError.message);
    accounts += 1;

    // Dedupe within the file, then against rows already stored (by FITID).
    const seen = new Set<string>();
    const rows = statement.transactions
      .filter((t) => t.fitId && !seen.has(t.fitId) && seen.add(t.fitId))
      .map((t) => ({
        user_id: userId,
        account_external_id: externalId,
        fit_id: t.fitId,
        posted_date: t.date,
        amount: t.amount,
        type: t.type,
        description: t.description,
        memo: t.memo,
      }));
    if (rows.length === 0) continue;

    const { data: existing } = await admin
      .from("bank_transactions")
      .select("fit_id")
      .eq("user_id", userId)
      .eq("account_external_id", externalId)
      .in(
        "fit_id",
        rows.map((r) => r.fit_id)
      );
    const existingIds = new Set(
      ((existing as { fit_id: string }[] | null) ?? []).map((r) => r.fit_id)
    );

    const toInsert = rows.filter((r) => !existingIds.has(r.fit_id));
    if (toInsert.length > 0) {
      const { error: insertError } = await admin
        .from("bank_transactions")
        .insert(toInsert);
      if (insertError) throw new Error(insertError.message);
    }
    inserted += toInsert.length;
    duplicates += rows.length - toInsert.length;
  }

  return { accounts, inserted, duplicates };
}

export async function getBankAccounts(userId: string): Promise<BankAccount[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bank_accounts")
    .select(
      "external_id, name, account_type, bsb, currency, balance, balance_date, updated_at"
    )
    .eq("user_id", userId)
    .order("name");

  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    externalId: row.external_id as string,
    name: row.name as string,
    accountType: (row.account_type as string | null) ?? null,
    bsb: (row.bsb as string | null) ?? null,
    currency: (row.currency as string | null) ?? null,
    balance: row.balance != null ? Number(row.balance) : null,
    balanceDate: (row.balance_date as string | null) ?? null,
    updatedAt: (row.updated_at as string | null) ?? null,
  }));
}

export async function getBankTransactions(
  userId: string,
  accountExternalId: string
): Promise<BankTransaction[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bank_transactions")
    .select("id, fit_id, posted_date, amount, type, description, memo")
    .eq("user_id", userId)
    .eq("account_external_id", accountExternalId)
    .order("posted_date", { ascending: false })
    .order("id", { ascending: false });

  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: row.id as string,
    fitId: row.fit_id as string,
    date: (row.posted_date as string | null) ?? null,
    amount: Number(row.amount),
    type: (row.type as string | null) ?? null,
    description: row.description as string,
    memo: (row.memo as string | null) ?? null,
  }));
}
