import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { importOfx } from "@/lib/bank/service";

export const maxDuration = 60;

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
