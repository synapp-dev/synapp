import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { getPerson } from "@/lib/people/service";
import { getGmailContext } from "@/lib/google/client";
import { listPersonEmailThreads } from "@/lib/google/gmail";
import type { PersonEmailResult } from "@/entities/people/model/types";

export const maxDuration = 30;

function ok(result: PersonEmailResult) {
  return NextResponse.json({ data: result, error: null });
}

// A 403 from Gmail means the connection predates the gmail.readonly scope and
// the user needs to reconnect to grant it.
function isScopeError(err: unknown): boolean {
  const status =
    typeof err === "object" && err !== null && "code" in err
      ? (err as { code?: number }).code
      : undefined;
  return status === 403;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  const { user, supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const { personId } = await params;

  try {
    const person = await getPerson(supabase, personId);
    if (!person) {
      return NextResponse.json(
        { data: null, error: { message: "Person not found" } },
        { status: 404 }
      );
    }

    if (person.emails.length === 0) {
      return ok({ status: "no_emails", threads: [] });
    }

    const context = await getGmailContext(user.id);
    if (!context) {
      return ok({ status: "not_connected", threads: [] });
    }

    const threads = await listPersonEmailThreads(context.gmail, person.emails);
    return ok({ status: "ok", threads });
  } catch (err) {
    if (isScopeError(err)) {
      return ok({ status: "needs_scope", threads: [] });
    }
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to load emails",
        },
      },
      { status: 500 }
    );
  }
}
