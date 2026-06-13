import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse, jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";
import { availabilityService } from "@/server/workforce/availability.service";
import { PeopleServiceError } from "@/server/workforce/people.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

export async function GET(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const url = new URL(request.url);
  const weekStartMonday = url.searchParams.get("weekStartMonday")?.trim() || null;

  try {
    const data = await availabilityService.getForVenue(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      weekStartMonday: weekStartMonday || undefined,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "availability");
  }
}

type PatchBody = {
  userProfileId?: string;
  dayOfWeek?: number;
  isAvailable?: boolean | null;
  /** When set, edits that roster week only (ISO Monday). Omit to edit recurring default. */
  weekStartMonday?: string | null;
  /** When `isAvailable` is true: both null/omitted = all day; both HH:mm = window. */
  availableStartTime?: string | null;
  availableEndTime?: string | null;
};

export async function PATCH(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return validationErrorResponse("Invalid JSON body", 400);
  }

  const userProfileId = body.userProfileId?.trim();
  const dayOfWeek = body.dayOfWeek;
  const rawAvailable = body.isAvailable;
  const weekStartMonday = body.weekStartMonday?.trim() || undefined;

  if (!userProfileId || typeof dayOfWeek !== "number") {
    return validationErrorResponse("userProfileId and dayOfWeek are required", 400);
  }

  if (!("isAvailable" in body)) {
    return validationErrorResponse("isAvailable is required (boolean or null to clear)", 400);
  }

  if (rawAvailable !== null && typeof rawAvailable !== "boolean") {
    return validationErrorResponse("isAvailable must be boolean or null", 400);
  }

  const nextAvailable: boolean | null = rawAvailable;

  let availableStartTime: string | null | undefined;
  let availableEndTime: string | null | undefined;
  if (nextAvailable === true) {
    const hasWindowKeys =
      Object.prototype.hasOwnProperty.call(body, "availableStartTime") ||
      Object.prototype.hasOwnProperty.call(body, "availableEndTime");
    if (!hasWindowKeys) {
      availableStartTime = null;
      availableEndTime = null;
    } else {
      const s = body.availableStartTime;
      const e = body.availableEndTime;
      const sEmpty = s === null || s === undefined || (typeof s === "string" && s.trim() === "");
      const eEmpty = e === null || e === undefined || (typeof e === "string" && e.trim() === "");
      if (sEmpty !== eEmpty) {
        return NextResponse.json(
          {
            data: null,
            error: {
              message:
                "When setting hours, send both availableStartTime and availableEndTime as HH:mm, or both null for all day",
              status: 400,
            },
          },
          { status: 400 }
        );
      }
      if (!sEmpty && typeof s === "string" && typeof e === "string") {
        availableStartTime = s.trim();
        availableEndTime = e.trim();
      } else {
        availableStartTime = null;
        availableEndTime = null;
      }
    }
  }

  try {
    await availabilityService.setAvailabilityCell(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      userProfileId,
      dayOfWeek,
      isAvailable: nextAvailable,
      weekStartMonday,
      availableStartTime,
      availableEndTime,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    return serviceErrorResponse(error, "availability");
  }
}

type PostBody = {
  action?: string;
  fromWeekStartMonday?: string;
  toWeekStartMonday?: string;
};

export async function POST(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return validationErrorResponse("Invalid JSON body", 400);
  }

  if (body.action !== "copy_week") {
    return validationErrorResponse("Unsupported action", 400);
  }

  const fromWeekStartMonday = body.fromWeekStartMonday?.trim();
  const toWeekStartMonday = body.toWeekStartMonday?.trim();
  if (!fromWeekStartMonday || !toWeekStartMonday) {
    return validationErrorResponse("fromWeekStartMonday and toWeekStartMonday are required", 400);
  }

  try {
    await availabilityService.copyWeekInstanceToWeek(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      fromWeekStartMonday,
      toWeekStartMonday,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    return serviceErrorResponse(error, "availability");
  }
}
