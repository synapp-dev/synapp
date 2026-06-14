import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import {
  getBankAccounts,
  getBankBalances,
  getXeroConnection,
} from "@/lib/xero/client";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const connection = await getXeroConnection(user.id);
  if (!connection) {
    return NextResponse.json({ data: [], error: null });
  }

  try {
    const accounts = await getBankAccounts(user.id);

    // Balances are best-effort: if the reports scope hasn't been granted yet
    // (e.g. before reconnecting), still return accounts with a null balance
    // rather than failing the whole request.
    let balances: Record<string, number> = {};
    try {
      balances = await getBankBalances(user.id);
    } catch (balanceErr) {
      console.warn(
        "[xero] bank balances unavailable:",
        balanceErr instanceof Error ? balanceErr.message : balanceErr
      );
    }

    const withBalances = accounts.map((account) => ({
      ...account,
      balance: balances[account.accountId] ?? null,
    }));
    return NextResponse.json({ data: withBalances, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message:
            err instanceof Error ? err.message : "Failed to load bank accounts",
        },
      },
      { status: 502 }
    );
  }
}
