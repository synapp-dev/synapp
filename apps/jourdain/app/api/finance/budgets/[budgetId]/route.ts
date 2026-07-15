import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { deleteBudget } from "@/lib/finance/service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

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
