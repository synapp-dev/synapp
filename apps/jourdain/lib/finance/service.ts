import { createAdminClient } from "@/utils/supabase/admin";
import {
  categoriseDescription,
  CATEGORIES,
  type Category,
  type CategoryRule,
} from "@/lib/finance/categorise";
import type { FinanceTransaction } from "@/lib/finance/stats";

export type Budget = {
  id: string;
  category: string;
  monthlyLimit: number;
  createdAt: string;
  updatedAt: string;
};

type TransactionRow = {
  id: string;
  account_external_id: string;
  posted_date: string | null;
  amount: number | string;
  type: string | null;
  description: string;
  category: string | null;
};

function isCategory(value: string | null): value is Category {
  return value !== null && (CATEGORIES as readonly string[]).includes(value);
}

/** Escape LIKE wildcards so a rule pattern matches as a literal substring,
 *  consistent with matchesPattern's includes() semantics. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function getCategoryRules(userId: string): Promise<CategoryRule[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("transaction_category_rules")
    .select("pattern, category")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as CategoryRule[] | null) ?? [];
}

function toTransaction(row: TransactionRow): FinanceTransaction {
  return {
    id: row.id,
    accountExternalId: row.account_external_id,
    date: row.posted_date,
    amount: Number(row.amount),
    type: row.type,
    description: row.description,
    category: isCategory(row.category) ? row.category : "other",
  };
}

/** Persist computed categories, skipping rows already stored with the same
 *  category. Buckets by category and updates the disjoint id sets in parallel. */
async function applyCategories(
  userId: string,
  rows: TransactionRow[],
  rules: CategoryRule[]
): Promise<number> {
  const byCategory = new Map<Category, string[]>();
  for (const row of rows) {
    const category = categoriseDescription(row.description, rules);
    if (category === row.category) continue;
    const ids = byCategory.get(category) ?? [];
    ids.push(row.id);
    byCategory.set(category, ids);
  }
  if (byCategory.size === 0) return 0;

  const admin = createAdminClient();
  await Promise.all(
    Array.from(byCategory, async ([category, ids]) => {
      const { error } = await admin
        .from("bank_transactions")
        .update({ category })
        .eq("user_id", userId)
        .in("id", ids);
      if (error) throw new Error(error.message);
    })
  );
  return Array.from(byCategory.values()).reduce(
    (total, ids) => total + ids.length,
    0
  );
}

/** All transactions for the user. Uncategorised rows are categorised in
 *  memory only; persistence happens at import time or via the categorise
 *  endpoint. */
export async function getFinanceTransactions(
  userId: string
): Promise<FinanceTransaction[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bank_transactions")
    .select(
      "id, account_external_id, posted_date, amount, type, description, category"
    )
    .eq("user_id", userId)
    .order("posted_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);

  const rows = (data as TransactionRow[] | null) ?? [];
  const uncategorised = rows.filter((row) => !isCategory(row.category));
  if (uncategorised.length > 0) {
    const rules = await getCategoryRules(userId);
    for (const row of uncategorised) {
      row.category = categoriseDescription(row.description, rules);
    }
  }

  return rows.map(toTransaction);
}

/** Re-run the categoriser. By default only uncategorised rows; force=true
 *  recategorises everything (used after rules change). Returns the number of
 *  rows whose stored category actually changed. */
export async function recategoriseTransactions(
  userId: string,
  force = false
): Promise<number> {
  const admin = createAdminClient();
  let query = admin
    .from("bank_transactions")
    .select("id, account_external_id, posted_date, amount, type, description, category")
    .eq("user_id", userId)
    .limit(10000);
  if (!force) query = query.is("category", null);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data as TransactionRow[] | null) ?? [];
  if (rows.length === 0) return 0;

  const rules = await getCategoryRules(userId);
  return applyCategories(userId, rows, rules);
}

/** Manually set the category on one transaction. Optionally save a rule
 *  (substring pattern) and apply it to every other matching transaction. */
export async function setTransactionCategory(
  userId: string,
  transactionId: string,
  category: Category,
  savePattern?: string
): Promise<{ updated: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bank_transactions")
    .update({ category })
    .eq("user_id", userId)
    .eq("id", transactionId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Transaction not found");
  let updated = 1;

  const pattern = savePattern?.trim();
  if (pattern) {
    const { error: ruleError } = await admin
      .from("transaction_category_rules")
      .insert({ user_id: userId, pattern, category });
    if (ruleError) throw new Error(ruleError.message);

    const { data: matches, error: matchError } = await admin
      .from("bank_transactions")
      .update({ category })
      .eq("user_id", userId)
      .neq("id", transactionId)
      .ilike("description", `%${escapeLike(pattern)}%`)
      .select("id");
    if (matchError) throw new Error(matchError.message);
    updated += matches?.length ?? 0;
  }

  return { updated };
}

type BudgetRow = {
  id: string;
  category: string;
  monthly_limit: number | string;
  created_at: string;
  updated_at: string;
};

function toBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    category: row.category,
    monthlyLimit: Number(row.monthly_limit),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getBudgets(userId: string): Promise<Budget[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("budgets")
    .select("id, category, monthly_limit, created_at, updated_at")
    .eq("user_id", userId)
    .order("category");
  if (error) throw new Error(error.message);
  return ((data as BudgetRow[] | null) ?? []).map(toBudget);
}

export async function upsertBudget(
  userId: string,
  category: Category,
  monthlyLimit: number
): Promise<Budget> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("budgets")
    .upsert(
      {
        user_id: userId,
        category,
        monthly_limit: monthlyLimit,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,category" }
    )
    .select("id, category, monthly_limit, created_at, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return toBudget(data as BudgetRow);
}

export async function deleteBudget(
  userId: string,
  budgetId: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("budgets")
    .delete()
    .eq("user_id", userId)
    .eq("id", budgetId);
  if (error) throw new Error(error.message);
}
