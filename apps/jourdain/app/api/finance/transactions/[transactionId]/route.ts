import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import { CATEGORIES } from "@/lib/finance/categorise";
import { setTransactionCategory } from "@/lib/finance/service";

const updateSchema = z.object({
  category: z.enum(CATEGORIES),
  savePattern: z.string().trim().min(2).max(200).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
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

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: "Invalid body", status: 400 } },
      { status: 400 }
    );
  }

  const { transactionId } = await params;
  try {
    const result = await setTransactionCategory(
      user.id,
      transactionId,
      parsed.data.category,
      parsed.data.savePattern
    );
    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message:
            err instanceof Error ? err.message : "Failed to update category",
        },
      },
      { status: 500 }
    );
  }
}
