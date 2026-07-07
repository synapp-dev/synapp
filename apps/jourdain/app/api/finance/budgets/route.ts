import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import { CATEGORIES } from "@/lib/finance/categorise";
import { getBudgets, upsertBudget } from "@/lib/finance/service";

const upsertSchema = z.object({
  category: z.enum(CATEGORIES),
  monthlyLimit: z.number().positive().max(1_000_000),
});

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", status: 401 } },
    { status: 401 }
  );
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

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
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

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
