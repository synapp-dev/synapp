import { db } from "@/server/db/drizzle";
import { feedbackTickets, userProfile } from "@/server/db/schema";
import { eq, desc, asc, sql } from "drizzle-orm";

/** Shape of a single admin note stored in the admin_notes JSONB array. */
export interface AdminNote {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
  readByUser: boolean;
}

export const feedbackTicketsRepo = {
  create: (data: {
    userId: string;
    type: string;
    pagePath: string;
    description: string;
    screenshotUrl?: string | null;
  }) =>
    db
      .insert(feedbackTickets)
      .values({
        userId: data.userId,
        type: data.type,
        pagePath: data.pagePath,
        description: data.description,
        screenshotUrl: data.screenshotUrl ?? null,
      })
      .returning(),

  getByUserId: (userId: string) =>
    db
      .select()
      .from(feedbackTickets)
      .where(eq(feedbackTickets.userId, userId))
      .orderBy(desc(feedbackTickets.createdAt)),

  /** Get all tickets with submitter profile, ordered oldest first. */
  getAll: () =>
    db
      .select({
        id: feedbackTickets.id,
        userId: feedbackTickets.userId,
        type: feedbackTickets.type,
        pagePath: feedbackTickets.pagePath,
        description: feedbackTickets.description,
        screenshotUrl: feedbackTickets.screenshotUrl,
        status: feedbackTickets.status,
        adminNotes: feedbackTickets.adminNotes,
        createdAt: feedbackTickets.createdAt,
        updatedAt: feedbackTickets.updatedAt,
        submitterFirstName: userProfile.firstName,
        submitterLastName: userProfile.lastName,
        submitterEmail: userProfile.email,
      })
      .from(feedbackTickets)
      .leftJoin(userProfile, eq(feedbackTickets.userId, userProfile.id))
      .orderBy(asc(feedbackTickets.createdAt)),

  /** Get a single ticket by ID with submitter profile. */
  getById: (id: string) =>
    db
      .select({
        id: feedbackTickets.id,
        userId: feedbackTickets.userId,
        type: feedbackTickets.type,
        pagePath: feedbackTickets.pagePath,
        description: feedbackTickets.description,
        screenshotUrl: feedbackTickets.screenshotUrl,
        status: feedbackTickets.status,
        adminNotes: feedbackTickets.adminNotes,
        createdAt: feedbackTickets.createdAt,
        updatedAt: feedbackTickets.updatedAt,
        submitterFirstName: userProfile.firstName,
        submitterLastName: userProfile.lastName,
        submitterEmail: userProfile.email,
      })
      .from(feedbackTickets)
      .leftJoin(userProfile, eq(feedbackTickets.userId, userProfile.id))
      .where(eq(feedbackTickets.id, id)),

  /** Update ticket status and set updated_at. */
  updateStatus: (id: string, status: string) =>
    db
      .update(feedbackTickets)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(feedbackTickets.id, id))
      .returning(),

  /** Append a note object to the admin_notes JSONB array. */
  addNote: (ticketId: string, note: AdminNote) =>
    db
      .update(feedbackTickets)
      .set({
        adminNotes: sql`COALESCE(${feedbackTickets.adminNotes}, '[]'::jsonb) || ${JSON.stringify(note)}::jsonb`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(feedbackTickets.id, ticketId))
      .returning(),

  /** Mark all notes on a ticket as read by the user (set readByUser = true). */
  markNotesReadByUser: (ticketId: string) =>
    db.execute(sql`
      UPDATE feedback_tickets
      SET admin_notes = (
        SELECT COALESCE(jsonb_agg(
          elem || '{"readByUser": true}'::jsonb
        ), '[]'::jsonb)
        FROM jsonb_array_elements(COALESCE(admin_notes, '[]'::jsonb)) AS elem
      ),
      updated_at = now()
      WHERE id = ${ticketId}
    `),

  /** Count tickets for a user that have at least one unread admin note. */
  getUnreadNoteCountForUser: async (userId: string): Promise<number> => {
    const result = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM feedback_tickets
      WHERE user_id = ${userId}
        AND jsonb_array_length(COALESCE(admin_notes, '[]'::jsonb)) > 0
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(admin_notes) AS elem
          WHERE (elem->>'readByUser')::boolean = false
        )
    `);
    return (result as any)[0]?.count ?? 0;
  },
};
