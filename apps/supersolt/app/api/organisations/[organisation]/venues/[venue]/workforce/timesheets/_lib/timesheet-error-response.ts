import { serviceErrorResponse } from "@/lib/api/service-error-response";

export function timesheetErrorResponse(error: unknown) {
  return serviceErrorResponse(error, "timesheets", {
    defaultCode: "internal_error",
  });
}
