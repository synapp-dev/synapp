import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse, jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";

import { rosterService } from "@/server/workforce/roster.service";
type RouteParams = {
  organisation: string;
  venue: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const url = new URL(request.url);
  const weekStart = url.searchParams.get("weekStart")?.trim();
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return validationErrorResponse("Query param weekStart=YYYY-MM-DD is required", 400);
  }

  const lifecycleRaw = url.searchParams.get("lifecycle")?.trim().toLowerCase();
  const lifecycle =
    lifecycleRaw === "draft" || lifecycleRaw === "all"
      ? lifecycleRaw
      : lifecycleRaw === "published" || lifecycleRaw === undefined || lifecycleRaw === ""
        ? "published"
        : null;
  if (!lifecycle) {
    return validationErrorResponse("Query param lifecycle must be published, draft, or all", 400);
  }

  try {
    const data = await rosterService.getWeek(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      weekStart,
      lifecycle,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "roster");
  }
}

type CreateShiftBody = {
  userProfileId?: string | null;
  shiftDate?: string;
  start?: string;
  end?: string;
  positionId?: string;
  breakMinutes?: number;
  weekStart?: string;
  overrideReason?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  let body: CreateShiftBody;
  try {
    body = (await request.json()) as CreateShiftBody;
  } catch {
    return validationErrorResponse("Invalid JSON body", 400);
  }

  const userProfileIdRaw = body.userProfileId;
  const userProfileId =
    userProfileIdRaw === null || userProfileIdRaw === undefined
      ? null
      : userProfileIdRaw.trim() || null;
  const shiftDate = body.shiftDate?.trim();
  const start = body.start?.trim();
  const end = body.end?.trim();
  const positionId = body.positionId?.trim();
  const breakMinutes = body.breakMinutes;
  const weekStart = body.weekStart?.trim();
  const overrideReason = body.overrideReason?.trim();

  if (!shiftDate || !start || !end || !positionId) {
    return validationErrorResponse(
      "shiftDate, start, end, and positionId are required",
    );
  }

  if (typeof breakMinutes !== "number" || !Number.isFinite(breakMinutes)) {
    return validationErrorResponse("breakMinutes must be a number", 400);
  }

  try {
    const data = await rosterService.createShift(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      userProfileId,
      shiftDate,
      start,
      end,
      positionId,
      breakMinutes: Math.round(breakMinutes),
      weekStart: weekStart || undefined,
      overrideReason,
    });
    return jsonDataResponse(data, 201);
  } catch (error) {
    return serviceErrorResponse(error, "roster");
  }
}

type PatchShiftBody = {
  shiftId?: string;
  userProfileId?: string | null;
  shiftDate?: string;
  start?: string;
  end?: string;
  positionId?: string;
  breakMinutes?: number;
  weekStart?: string;
  overrideReason?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  let body: PatchShiftBody;
  try {
    body = (await request.json()) as PatchShiftBody;
  } catch {
    return validationErrorResponse("Invalid JSON body", 400);
  }

  const shiftId = body.shiftId?.trim();
  const userProfileIdRaw = body.userProfileId;
  const userProfileId =
    userProfileIdRaw === null || userProfileIdRaw === undefined
      ? null
      : userProfileIdRaw.trim() || null;
  const shiftDate = body.shiftDate?.trim();
  const start = body.start?.trim();
  const end = body.end?.trim();
  const positionId = body.positionId?.trim();
  const breakMinutes = body.breakMinutes;
  const weekStart = body.weekStart?.trim();
  const overrideReason = body.overrideReason?.trim();

  if (!shiftId || !shiftDate || !start || !end || !positionId) {
    return validationErrorResponse(
      "shiftId, shiftDate, start, end, and positionId are required",
    );
  }

  if (typeof breakMinutes !== "number" || !Number.isFinite(breakMinutes)) {
    return validationErrorResponse("breakMinutes must be a number", 400);
  }

  try {
    const data = await rosterService.updateShift(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      shiftId,
      userProfileId,
      shiftDate,
      start,
      end,
      positionId,
      breakMinutes: Math.round(breakMinutes),
      weekStart: weekStart || undefined,
      overrideReason,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "roster");
  }
}
