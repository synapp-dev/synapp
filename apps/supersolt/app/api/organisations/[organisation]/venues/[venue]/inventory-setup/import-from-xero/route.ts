import { after } from "next/server";

import {
  inventorySetupService,
  InventorySetupServiceError,
} from "@/server/inventory-setup/inventory-setup.service";
import { runInvoiceFirstImport } from "@/server/inventory-setup/invoice-first-import.service";
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
  let daysBack: number | undefined;
  let jobId: string | undefined;
  let variant: "invoice_first" | undefined;
  try {
    const body = (await request.json()) as {
      daysBack?: number;
      jobId?: string;
      variant?: "invoice_first";
    };
    daysBack = body.daysBack;
    jobId = body.jobId;
    if (body.variant === "invoice_first") {
      variant = "invoice_first";
    }
  } catch {
    daysBack = undefined;
    jobId = undefined;
  }

  try {
    if (jobId) {
      const job = await inventorySetupService.getImportJob(ctx, {
        organisationSlug: organisation,
        venueSlug: venue,
        jobId,
      });
      if (!job) {
        throw new InventorySetupServiceError(404, "Import job not found");
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
          if (variant === "invoice_first") {
            await runInvoiceFirstImport(ctx, {
              organisationSlug: organisation,
              venueSlug: venue,
              daysBack,
              jobId,
            });
          } else {
            await inventorySetupService.importFromXero(ctx, {
              organisationSlug: organisation,
              venueSlug: venue,
              daysBack,
              jobId,
            });
          }
        } catch (error) {
          if (isServiceError(error) && error.status === 409) {
            return;
          }
          console.error("[inventory-setup] background import failed", error);
        }
      });

      const response: ImportAcceptedResponse = { accepted: true, jobId };
      return jsonDataResponse(response, 202);
    }

    const data =
      variant === "invoice_first"
        ? await runInvoiceFirstImport(ctx, {
            organisationSlug: organisation,
            venueSlug: venue,
            daysBack,
          })
        : await inventorySetupService.importFromXero(ctx, {
            organisationSlug: organisation,
            venueSlug: venue,
            daysBack,
          });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/import-from-xero");
  }
}
