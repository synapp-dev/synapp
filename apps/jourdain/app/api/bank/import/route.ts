import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { importOfx } from "@/lib/bank/service";
import { recategoriseTransactions } from "@/lib/finance/service";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const body = (await request.json().catch(() => null)) as {
    content?: unknown;
  } | null;
  const content = body?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { data: null, error: { message: "No OFX content provided", status: 400 } },
      { status: 400 }
    );
  }

  try {
    const summary = await importOfx(user.id, content);
    // Persist categories for the freshly inserted rows in one batched pass.
    if (summary.inserted > 0) {
      await recategoriseTransactions(user.id);
    }
    return NextResponse.json({ data: summary, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Import failed",
        },
      },
      { status: 500 }
    );
  }
}
