/**
 * GET /api/users/lookup?email=&schoolId=
 *
 * Resolves whether an email is registered and returns minimal prefill data.
 * Platform admins or school admins (with manage-school-user-roles at schoolId).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { userLookupService } from "@/server/user/user-lookup.service";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const schoolId = searchParams.get("schoolId") ?? undefined;

    const result = await userLookupService.lookupByEmail(userId, {
      email,
      schoolId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    const err = e as { message?: string; name?: string };
    console.error("[USER LOOKUP] Error:", err);

    if (err.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: (e as z.ZodError).issues },
        { status: 400 }
      );
    }

    const status = err.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status }
    );
  }
}
