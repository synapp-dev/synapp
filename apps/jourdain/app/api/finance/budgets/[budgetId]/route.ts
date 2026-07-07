import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { deleteBudget } from "@/lib/finance/service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
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

  const { budgetId } = await params;
  try {
    await deleteBudget(user.id, budgetId);
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to delete budget",
        },
      },
      { status: 500 }
    );
  }
}
