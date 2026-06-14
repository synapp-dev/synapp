import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { getBankAccounts } from "@/lib/bank/service";

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

  const accounts = await getBankAccounts(user.id);
  return NextResponse.json({ data: accounts, error: null });
}
