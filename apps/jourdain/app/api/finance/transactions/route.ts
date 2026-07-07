import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { getFinanceTransactions } from "@/lib/finance/service";

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

  try {
    const transactions = await getFinanceTransactions(user.id);
    return NextResponse.json({ data: transactions, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message:
            err instanceof Error ? err.message : "Failed to load transactions",
        },
      },
      { status: 500 }
    );
  }
}
