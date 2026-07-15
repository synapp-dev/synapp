import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { getFinanceTransactions } from "@/lib/finance/service";

export async function GET() {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

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
