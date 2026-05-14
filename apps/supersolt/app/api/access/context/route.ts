import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { loadAccessContextForUser } from "@/server/access/load-access-context-for-user";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Unauthorized",
          status: 401,
        },
      },
      { status: 401 }
    );
  }

  const result = await loadAccessContextForUser(supabase, user.id);
  if (result.error) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: result.error.message,
          status: 500,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: result.data, error: null });
}
