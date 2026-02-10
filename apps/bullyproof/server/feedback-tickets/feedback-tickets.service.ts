import { feedbackTicketsRepo } from "./feedback-tickets.repo";
import type { AdminNote } from "./feedback-tickets.repo";
import {
  createFeedbackTicketSchema,
  updateTicketStatusSchema,
  addAdminNoteSchema,
} from "./feedback-tickets.validators";
import {
  getUserScopedRoles,
  hasPlatformRole,
  ALL_PLATFORM_ADMIN_KEYS,
} from "@/server/auth/rbac";

type AuthContext = {
  userId: string | null;
};

/** Assert userId is present. */
function assertAuth(ctx: AuthContext): asserts ctx is { userId: string } {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
}

/** Assert the user holds at least one platform admin role. */
async function assertPlatformAdmin(userId: string) {
  const scopedRoles = await getUserScopedRoles(userId);
  if (!hasPlatformRole(scopedRoles, ...ALL_PLATFORM_ADMIN_KEYS)) {
    throw new Error("Forbidden");
  }
  return scopedRoles;
}

export const feedbackTicketsService = {
  // ── Existing ──────────────────────────────────────────────────────────

  async submitTicket(
    ctx: AuthContext,
    params: unknown,
    screenshotUrl?: string | null
  ) {
    assertAuth(ctx);

    const data = createFeedbackTicketSchema.parse(params);

    const [ticket] = await feedbackTicketsRepo.create({
      userId: ctx.userId,
      type: data.type,
      pagePath: data.pagePath,
      description: data.description,
      screenshotUrl: screenshotUrl ?? null,
    });

    return ticket;
  },

  // ── Admin: List all tickets ───────────────────────────────────────────

  async getAllTickets(ctx: AuthContext) {
    assertAuth(ctx);
    await assertPlatformAdmin(ctx.userId);
    return feedbackTicketsRepo.getAll();
  },

  // ── Admin: Get single ticket ──────────────────────────────────────────

  async getTicketById(ctx: AuthContext, ticketId: string) {
    assertAuth(ctx);
    await assertPlatformAdmin(ctx.userId);
    const rows = await feedbackTicketsRepo.getById(ticketId);
    if (rows.length === 0) throw new Error("Not found");
    return rows[0];
  },

  // ── Admin: Update ticket status ───────────────────────────────────────

  async updateTicketStatus(ctx: AuthContext, ticketId: string, params: unknown) {
    assertAuth(ctx);
    const scopedRoles = await assertPlatformAdmin(ctx.userId);
    const data = updateTicketStatusSchema.parse(params);

    // Only INTRADARK_DEV can close tickets
    if (data.status === "closed") {
      if (!hasPlatformRole(scopedRoles, "INTRADARK_DEV")) {
        throw new Error("Forbidden: Only Intradark Dev can close tickets");
      }
    }

    const [updated] = await feedbackTicketsRepo.updateStatus(
      ticketId,
      data.status
    );
    if (!updated) throw new Error("Not found");
    return updated;
  },

  // ── Admin: Add a note ─────────────────────────────────────────────────

  async addAdminNote(ctx: AuthContext, ticketId: string, params: unknown) {
    assertAuth(ctx);
    const scopedRoles = await assertPlatformAdmin(ctx.userId);
    const data = addAdminNoteSchema.parse(params);

    // Determine author display name from the role
    const roleKey =
      scopedRoles.platform.find((k) =>
        (ALL_PLATFORM_ADMIN_KEYS as readonly string[]).includes(k)
      ) ?? "PLATFORM_STAFF";

    // We need the user's name — do a quick lookup
    const { userProfile } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { db } = await import("@/server/db/drizzle");
    const profileRows = await db
      .select({ firstName: userProfile.firstName, lastName: userProfile.lastName })
      .from(userProfile)
      .where(eq(userProfile.id, ctx.userId));
    const profile = profileRows[0];

    const authorName = profile
      ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "Admin"
      : "Admin";

    const note: AdminNote = {
      id: crypto.randomUUID(),
      authorId: ctx.userId,
      authorName,
      authorRole: roleKey,
      text: data.text,
      createdAt: new Date().toISOString(),
      readByUser: false,
    };

    const [updated] = await feedbackTicketsRepo.addNote(ticketId, note);
    if (!updated) throw new Error("Not found");
    return note;
  },

  // ── User: Mark notes as read ──────────────────────────────────────────

  async markNotesRead(ctx: AuthContext, ticketId: string) {
    assertAuth(ctx);

    // Verify ticket belongs to this user
    const rows = await feedbackTicketsRepo.getById(ticketId);
    if (rows.length === 0) throw new Error("Not found");
    if (rows[0].userId !== ctx.userId) {
      throw new Error("Forbidden");
    }

    await feedbackTicketsRepo.markNotesReadByUser(ticketId);
    return { success: true };
  },

  // ── User: Get unread note count ───────────────────────────────────────

  async getUnreadNoteCount(ctx: AuthContext) {
    assertAuth(ctx);
    const count = await feedbackTicketsRepo.getUnreadNoteCountForUser(
      ctx.userId
    );
    return { count };
  },
};
