import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import {
  errorDetailsFromUnknown,
  onboardingLogVenueError,
} from "@/server/onboarding/onboarding-route-log";
import { createOnboardingVenue } from "@/server/onboarding/onboarding.service";

type Body = {
  organisationId?: string;
  name?: string;
  addressLine1?: string | null;
  timezone?: string;
};

export async function POST(request: Request) {
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

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON", status: 400 } },
      { status: 400 }
    );
  }

  if (!body.organisationId?.trim()) {
    return NextResponse.json(
      { data: null, error: { message: "organisationId is required", status: 400 } },
      { status: 400 }
    );
  }

  try {
    const venue = await createOnboardingVenue(supabase, user.id, {
      organisationId: body.organisationId.trim(),
      name: body.name ?? "",
      addressLine1: body.addressLine1,
      timezone: body.timezone,
    });
    return NextResponse.json({ data: { venue }, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    onboardingLogVenueError("create_failed", {
      userId: user.id,
      organisationId: body.organisationId?.trim() ?? "",
      ...errorDetailsFromUnknown(e),
    });
    return NextResponse.json(
      { data: null, error: { message, status: 400 } },
      { status: 400 }
    );
  }
}
