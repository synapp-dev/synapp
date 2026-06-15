import { after } from "next/server";

import {
  inventorySetupService,
  InventorySetupServiceError,
} from "@/server/inventory-setup/inventory-setup.service";
import { IMPORT_JOB_SELECTION_GATE } from "@/server/inventory-setup/inventory-setup-import-job.types";
import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  isServiceError,
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";

export const maxDuration = 300;

type RouteParams = { organisation: string; venue: string };

type ParseSelectedAcceptedResponse = {
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
  let supplierIds: string[] = [];
  try {
    const body = (await request.json()) as {
      jobId?: string;
      supplierIds?: string[];
    };
    jobId = body.jobId;
    supplierIds = Array.isArray(body.supplierIds) ? body.supplierIds : [];
  } catch {
    jobId = undefined;
    supplierIds = [];
  }

  try {
    if (!jobId) {
      throw new InventorySetupServiceError(400, "jobId is required");
    }

    const job = await inventorySetupService.getImportJob(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      jobId,
    });
    if (!job) {
      throw new InventorySetupServiceError(404, "Import job not found");
    }

    if (job.status === "completed") {
      const response: ParseSelectedAcceptedResponse = {
        accepted: true,
        jobId,
        alreadyCompleted: true,
      };
      return jsonDataResponse(response, 200);
    }

    if (job.status !== "running" || job.currentStepId !== IMPORT_JOB_SELECTION_GATE) {
      // Already left the gate (parsing or finished) — nothing more to dispatch.
      const response: ParseSelectedAcceptedResponse = {
        accepted: true,
        jobId,
        alreadyRunning: true,
      };
      return jsonDataResponse(response, 202);
    }

    const selectedJobId = jobId;
    after(async () => {
      try {
        await inventorySetupService.parseSelectedSuppliersForSetup(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
          jobId: selectedJobId,
          supplierIds,
        });
      } catch (error) {
        if (isServiceError(error) && error.status === 409) {
          return;
        }
        console.error("[inventory-setup] background scoped parse failed", error);
      }
    });

    const response: ParseSelectedAcceptedResponse = { accepted: true, jobId };
    return jsonDataResponse(response, 202);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/parse-selected");
  }
}
