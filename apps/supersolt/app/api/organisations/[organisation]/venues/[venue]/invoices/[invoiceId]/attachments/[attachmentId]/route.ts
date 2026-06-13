import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { eq } from "drizzle-orm";
import { venueInvoiceAttachments } from "@/server/db/schema";
import { downloadInvoiceAttachment } from "@/server/invoices/invoice-storage";
import { scopeRepo } from "@/server/db/scope.repo";
import { assertVenueMember } from "@/server/auth/rbac";

type RouteParams = {
  organisation: string;
  venue: string;
  invoiceId: string;
  attachmentId: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, attachmentId } = await context.params;

  const scope = await ctx.appDb.rls((tx) =>
    scopeRepo.getVenueContextBySlugs(tx, organisation, venue),
  );
  if (!scope) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }
  assertVenueMember(ctx.tenantRoles, {
    organisationId: scope.organisationId,
    venueId: scope.venueId,
  });

  const rows = await ctx.appDb.rls((tx) =>
    tx
      .select()
      .from(venueInvoiceAttachments)
      .where(eq(venueInvoiceAttachments.id, attachmentId))
      .limit(1),
  );
  const attachment = rows[0];
  if (!attachment || attachment.venueId !== scope.venueId) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  try {
    const { bytes, mimeType } = await downloadInvoiceAttachment(attachment.storagePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeType ?? attachment.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${attachment.fileName}"`,
      },
    });
  } catch (error) {
    console.error("[invoices] attachment download", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
