import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { getBankAccounts } from "@/lib/bank/service";

export async function GET() {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const accounts = await getBankAccounts(user.id);
  return NextResponse.json({ data: accounts, error: null });
}
