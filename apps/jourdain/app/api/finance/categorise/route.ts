import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import { recategoriseTransactions } from "@/lib/finance/service";

const bodySchema = z.object({ force: z.boolean().optional() });

export async function POST(request: NextRequest) {
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

  const parsed = bodySchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: "Invalid body", status: 400 } },
      { status: 400 }
    );
  }

  try {
    const updated = await recategoriseTransactions(
      user.id,
      parsed.data.force ?? false
    );
    return NextResponse.json({ data: { updated }, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to categorise",
        },
      },
      { status: 500 }
    );
  }
}
