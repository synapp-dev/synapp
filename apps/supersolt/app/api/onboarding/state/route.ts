import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import {
  errorDetailsFromUnknown,
  onboardingLogStateError,
} from "@/server/onboarding/onboarding-route-log";
import { getOnboardingState } from "@/server/onboarding/onboarding.service";

export async function GET() {
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
    const state = await getOnboardingState(supabase, user.id);
    return NextResponse.json({ data: state, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    onboardingLogStateError("get_state_failed", {
      userId: user.id,
      ...errorDetailsFromUnknown(e),
    });
    return NextResponse.json(
      { data: null, error: { message, status: 500 } },
      { status: 500 }
    );
  }
}
