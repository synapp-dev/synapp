import { NextResponse } from "next/server";

import { AuthError } from "@/server/auth/errors";
import { MembersServiceError } from "@/server/organisations/members-errors";

export type ServiceErrorLike = Error & {
  status: number;
  code?: string;
};

export function isServiceError(error: unknown): error is ServiceErrorLike {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof (error as ServiceErrorLike).status === "number"
  );
}

export function serviceErrorResponse(
  error: unknown,
  logTag: string,
  options?: { defaultCode?: string },
) {
  if (isServiceError(error)) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: error.message,
          status: error.status,
          ...(error.code ? { code: error.code } : {}),
          ...(!error.code && options?.defaultCode ? { code: options.defaultCode } : {}),
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        data: null,
        error: { message: error.message, status: error.status },
      },
      { status: error.status },
    );
  }

  console.error(`[${logTag}]`, error);
  return NextResponse.json(
    {
      data: null,
      error: {
        message: "Internal server error",
        status: 500,
        ...(options?.defaultCode ? { code: options.defaultCode } : {}),
      },
    },
    { status: 500 },
  );
}

/** Domain-scoped API error response (replaces per-domain one-liner wrappers). */
export function domainErrorResponse(
  error: unknown,
  domain: string,
  options?: { defaultCode?: string },
) {
  return serviceErrorResponse(error, domain, options);
}

export function handleMembersRouteError(error: unknown) {
  if (error instanceof MembersServiceError) {
    return serviceErrorResponse(error, "members");
  }

  const internal = Object.assign(new Error("Internal server error"), {
    status: 500,
    code: "permissions.internal_error",
  });
  return serviceErrorResponse(internal, "members");
}

export function jsonDataResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

export function validationErrorResponse(message: string, status = 400, code?: string) {
  return NextResponse.json(
    {
      data: null,
      error: {
        message,
        status,
        ...(code ? { code } : {}),
      },
    },
    { status },
  );
}
