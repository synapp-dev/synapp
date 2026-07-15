import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { getBankTransactions } from "@/lib/bank/service";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const accountId = request.nextUrl.searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json(
      { data: null, error: { message: "accountId is required", status: 400 } },
      { status: 400 }
    );
  }

  const transactions = await getBankTransactions(user.id, accountId);
  return NextResponse.json({ data: transactions, error: null });
}
