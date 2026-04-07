import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import {
  suppliersService,
  SuppliersServiceError,
  type UpsertSupplierInput,
} from "@/server/suppliers/suppliers.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

async function getUserId() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, userId: null as string | null };
  }

  return { supabase, userId: user.id };
}

function parsePageSearchParams(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  const search = searchParams.get("search") ?? undefined;
  const rawCategory = searchParams.get("category") ?? undefined;
  const category =
    rawCategory === "all" || rawCategory === undefined || rawCategory === ""
      ? undefined
      : rawCategory;
  const rawStatus = searchParams.get("status") ?? undefined;
  const status =
    rawStatus === "all" || rawStatus === undefined || rawStatus === "" ? undefined : rawStatus;

  return {
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    search,
    category,
    status,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue } = await context.params;
  const params = parsePageSearchParams(new URL(request.url).searchParams);

  try {
    const data = await suppliersService.list(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      ...params,
    });
    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof SuppliersServiceError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, status: error.status } },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { data: null, error: { message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation, venue } = await context.params;
  const payload = (await request.json()) as UpsertSupplierInput;

  try {
    const data = await suppliersService.create(supabase, {
      userId,
      organisationSlug: organisation,
      venueSlug: venue,
      input: payload,
    });
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof SuppliersServiceError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, status: error.status } },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { data: null, error: { message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}
