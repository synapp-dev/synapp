import { NextResponse } from "next/server";

import { ReadinessBlockedError, ReadinessServiceError } from "@/server/readiness/readiness.errors";

export function readinessBlockedResponse(error: ReadinessBlockedError) {
  return NextResponse.json(
    {
      data: null,
      error: {
        message: error.message,
        status: error.status,
        code: error.code,
        moduleId: error.moduleId,
        blockers: error.blockers,
      },
    },
    { status: error.status },
  );
}

export function readinessServiceErrorResponse(error: ReadinessServiceError) {
  return NextResponse.json(
    {
      data: null,
      error: {
        message: error.message,
        status: error.status,
        ...(error.code ? { code: error.code } : {}),
      },
    },
    { status: error.status },
  );
}

export function handleReadinessRouteError(error: unknown) {
  if (error instanceof ReadinessBlockedError) {
    return readinessBlockedResponse(error);
  }
  if (error instanceof ReadinessServiceError) {
    return readinessServiceErrorResponse(error);
  }
  throw error;
}
