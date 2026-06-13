import { after } from "next/server";

import {
  squareCatalogImportService,
  SquareCatalogImportServiceError,
} from "@/server/inventory-setup/square-catalog-import.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  isServiceError,
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";

export const maxDuration = 300;

type RouteParams = { organisation: string; venue: string };

type ImportAcceptedResponse = {
  accepted: true;
  jobId: string;
  alreadyRunning?: boolean;
  alreadyCompleted?: boolean;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  let jobId: string | undefined;
  try {
    const body = (await request.json()) as { jobId?: string };
    jobId = body.jobId;
  } catch {
    jobId = undefined;
  }

  try {
    if (jobId) {
      const job = await squareCatalogImportService.getImportJob(ctx, {
        organisationSlug: organisation,
        venueSlug: venue,
        jobId,
      });
      if (!job) {
        throw new SquareCatalogImportServiceError(404, "Import job not found");
      }

      if (job.status === "completed") {
        const response: ImportAcceptedResponse = {
          accepted: true,
          jobId,
          alreadyCompleted: true,
        };
        return jsonDataResponse(response, 200);
      }

      if (job.status === "running") {
        const response: ImportAcceptedResponse = {
          accepted: true,
          jobId,
          alreadyRunning: true,
        };
        return jsonDataResponse(response, 202);
      }

      after(async () => {
        try {
          await squareCatalogImportService.importFromSquare(ctx, {
            organisationSlug: organisation,
            venueSlug: venue,
            jobId,
          });
        } catch (error) {
          if (isServiceError(error) && error.status === 409) {
            return;
          }
          console.error("[pos-catalog-import] background import failed", error);
        }
      });

      const response: ImportAcceptedResponse = { accepted: true, jobId };
      return jsonDataResponse(response, 202);
    }

    const data = await squareCatalogImportService.importFromSquare(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/import-from-square");
  }
}
