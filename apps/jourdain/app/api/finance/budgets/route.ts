import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestUser } from "@/lib/api/route-auth";
import { CATEGORIES } from "@/lib/finance/categorise";
import { getBudgets, upsertBudget } from "@/lib/finance/service";

const upsertSchema = z.object({
  category: z.enum(CATEGORIES),
  monthlyLimit: z.number().positive().max(1_000_000),
});

export async function GET() {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  try {
    const budgets = await getBudgets(user.id);
    return NextResponse.json({ data: budgets, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to load budgets",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const parsed = upsertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: "Invalid body", status: 400 } },
      { status: 400 }
    );
  }

  try {
    const budget = await upsertBudget(
      user.id,
      parsed.data.category,
      parsed.data.monthlyLimit
    );
    return NextResponse.json({ data: budget, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to save budget",
        },
      },
      { status: 500 }
    );
  }
}
