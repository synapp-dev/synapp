/**
 * Feedback Tickets API route handler.
 *
 * Endpoints:
 * - GET  /api/feedback-tickets  - List all tickets (admin — requires platform role)
 * - POST /api/feedback-tickets  - Create a feedback ticket (any authenticated user)
 */
import { NextResponse } from "next/server";
import { feedbackTicketsService } from "@/server/feedback-tickets/feedback-tickets.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { createServerClient } from "@/utils/supabase/server";
import { sendTicketNotificationEmail } from "@/server/lib/email";
import { db } from "@/server/db/drizzle";
import { userProfile } from "@/server/db/schema";
import { vUsersWithRolesAndSchools } from "@/drizzle/schema";
import { roles as rolesTable } from "@/drizzle/schema";
import { eq, inArray } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/feedback-tickets
 * Admin: returns all tickets with submitter info and signed screenshot URLs.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tickets = await feedbackTicketsService.getAllTickets({ userId });

    // Generate signed URLs for screenshots
    const supabase = await createServerClient();
    const ticketsWithSignedUrls = await Promise.all(
      tickets.map(async (ticket) => {
        if (!ticket.screenshotUrl) return ticket;
        const { data, error } = await supabase.storage
          .from("content")
          .createSignedUrl(ticket.screenshotUrl, 3600);
        return {
          ...ticket,
          screenshotUrl: error ? null : data.signedUrl,
        };
      })
    );

    return NextResponse.json(ticketsWithSignedUrls, { status: 200 });
  } catch (e: any) {
    console.error("[feedback-tickets] GET Error:", e);
    if (e.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const status = e.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const type = formData.get("type") as string;
    const pagePath = formData.get("pagePath") as string;
    const description = formData.get("description") as string;
    const screenshotFile = formData.get("screenshot") as File | null;

    let screenshotUrl: string | null = null;

    // Upload screenshot to Supabase Storage if provided
    if (screenshotFile && screenshotFile.size > 0) {
      const supabase = await createServerClient();
      const timestamp = Date.now();
      const ext = screenshotFile.name?.split(".").pop() || "png";
      const storagePath = `feedback-screenshots/${userId}/${timestamp}.${ext}`;

      const buffer = Buffer.from(await screenshotFile.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("content")
        .upload(storagePath, buffer, {
          contentType: screenshotFile.type || "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error("[feedback-tickets] Screenshot upload failed:", uploadError);
        // Continue without screenshot — don't block ticket creation
      } else {
        screenshotUrl = storagePath;
      }
    }

    const ticket = await feedbackTicketsService.submitTicket(
      { userId },
      { type, pagePath, description },
      screenshotUrl
    );

    // ── Fire-and-forget: send email notification ──────────────────────────
    (async () => {
      try {
        // Look up submitter's profile + roles/schools from the view
        const viewRows = await db
          .select({
            firstName: vUsersWithRolesAndSchools.firstName,
            lastName: vUsersWithRolesAndSchools.lastName,
            email: vUsersWithRolesAndSchools.email,
            platformRoles: vUsersWithRolesAndSchools.platformRoles,
            schoolRoles: vUsersWithRolesAndSchools.schoolRoles,
          })
          .from(vUsersWithRolesAndSchools)
          .where(eq(vUsersWithRolesAndSchools.id, userId));
        const userRow = viewRows[0];

        const submitterName = userRow
          ? `${userRow.firstName ?? ""} ${userRow.lastName ?? ""}`.trim() || "Unknown"
          : "Unknown";
        const submitterEmail = userRow?.email ?? "unknown";

        // Platform roles come as key strings — map to human-readable names
        const platformRoleKeys: string[] = (userRow?.platformRoles as unknown as string[]) ?? [];
        let platformRoleNames: string[] = platformRoleKeys;
        if (platformRoleKeys.length > 0) {
          const roleRows = await db
            .select({ key: rolesTable.key, name: rolesTable.name })
            .from(rolesTable)
            .where(inArray(rolesTable.key, platformRoleKeys));
          const keyToName = new Map(roleRows.map((r) => [r.key, r.name]));
          platformRoleNames = platformRoleKeys.map((k) => keyToName.get(k) ?? k);
        }

        // School roles come as JSONB array with { schoolId, schoolName, roleKey, roleName }
        const rawSchoolRoles = (userRow?.schoolRoles as unknown as Array<{
          schoolId: string;
          schoolName: string;
          roleKey: string;
          roleName: string;
        }>) ?? [];
        const schoolRoles = rawSchoolRoles.map((sr) => ({
          schoolName: sr.schoolName ?? "Unknown School",
          roleName: sr.roleName ?? sr.roleKey ?? "Unknown Role",
        }));

        // Generate a long-lived signed URL for the screenshot (7 days)
        let screenshotSignedUrl: string | null = null;
        if (screenshotUrl) {
          const supabaseForEmail = await createServerClient();
          const { data } = await supabaseForEmail.storage
            .from("content")
            .createSignedUrl(screenshotUrl, 604800); // 7 days
          screenshotSignedUrl = data?.signedUrl ?? null;
        }

        await sendTicketNotificationEmail({
          ticketId: ticket.id,
          type,
          description,
          pagePath,
          submitterEmail,
          submitterName,
          screenshotSignedUrl,
          createdAt: ticket.createdAt,
          platformRoles: platformRoleNames,
          schoolRoles,
        });
      } catch (emailErr) {
        console.error("[feedback-tickets] Email notification failed:", emailErr);
      }
    })();

    return NextResponse.json(ticket, { status: 201 });
  } catch (e: any) {
    console.error("[feedback-tickets] Error:", e);
    const status = e.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
