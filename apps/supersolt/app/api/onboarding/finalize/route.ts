import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import {
  errorDetailsFromUnknown,
  onboardingLogFinalizeError,
} from "@/server/onboarding/onboarding-route-log";
import { finalizeOnboarding } from "@/server/onboarding/onboarding.service";

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  try {
    await finalizeOnboarding(supabase, user.id);
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    onboardingLogFinalizeError("finalize_failed", {
      userId: user.id,
      ...errorDetailsFromUnknown(e),
    });
    return NextResponse.json(
      { data: null, error: { message, status: 400 } },
      { status: 400 }
    );
  }
}
