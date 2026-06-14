import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { getBankTransactions, getXeroConnection } from "@/lib/xero/client";

export async function GET(request: NextRequest) {
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

  const accountId = request.nextUrl.searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json(
      { data: null, error: { message: "accountId is required", status: 400 } },
      { status: 400 }
    );
  }

  const connection = await getXeroConnection(user.id);
  if (!connection) {
    return NextResponse.json({ data: [], error: null });
  }

  try {
    const transactions = await getBankTransactions(user.id, accountId);
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
      { status: 502 }
    );
  }
}
