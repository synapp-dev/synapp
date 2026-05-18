import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { dashboardPreferencesPatchSchema } from "@/server/dashboard/dashboard-preferences.schema";
import {
  getDashboardPreferencesForUserOrg,
  resolveOrganisationIdForMemberSlug,
  upsertDashboardPreferencesForUserOrg,
} from "@/server/dashboard/dashboard-preferences.service";

type RouteParams = {
  organisation: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<RouteParams> },
) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 },
    );
  }

  const { organisation } = await context.params;

  try {
    const organisationId = await resolveOrganisationIdForMemberSlug(
      supabase,
      user.id,
      organisation,
    );
    if (!organisationId) {
      return NextResponse.json(
        { data: null, error: { message: "Forbidden", status: 403 } },
        { status: 403 },
      );
    }

    const prefs = await getDashboardPreferencesForUserOrg(
      supabase,
      user.id,
      organisationId,
    );
    return NextResponse.json({ data: prefs, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: { message, status: 500 } },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 },
    );
  }

  const { organisation } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON", status: 400 } },
      { status: 400 },
    );
  }

  const parsed = dashboardPreferencesPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Validation failed",
          status: 400,
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  try {
    const organisationId = await resolveOrganisationIdForMemberSlug(
      supabase,
      user.id,
      organisation,
    );
    if (!organisationId) {
      return NextResponse.json(
        { data: null, error: { message: "Forbidden", status: 403 } },
        { status: 403 },
      );
    }

    const prefs = await upsertDashboardPreferencesForUserOrg(
      supabase,
      user.id,
      organisationId,
      parsed.data,
    );
    return NextResponse.json({ data: prefs, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: { message, status: 500 } },
      { status: 500 },
    );
  }
}
