import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { createSupabaseAdmin } from "@/utils/supabase/admin";
import { VenueAccessError } from "@/server/access/venue-access";
import { getSalesInsightsOrders } from "@/server/sales/sales-insights.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
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

  const { organisation, venue } = await context.params;
  const url = new URL(request.url);
  const startIso = url.searchParams.get("start")?.trim() ?? "";
  const endIso = url.searchParams.get("end")?.trim() ?? "";

  if (!startIso || !endIso) {
    return NextResponse.json(
      {
        data: null,
        error: { message: "Query params start and end (ISO 8601) are required", status: 400 },
      },
      { status: 400 }
    );
  }

  try {
    const admin = createSupabaseAdmin();
    const result = await getSalesInsightsOrders(supabase, admin, {
      userId: user.id,
      organisationSlug: organisation,
      venueSlug: venue,
      startIso,
      endIso,
    });
    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    if (error instanceof VenueAccessError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, status: error.status } },
        { status: error.status }
      );
    }

    console.error("[sales-insights] orders", error);
    return NextResponse.json(
      { data: null, error: { message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}
