import { z } from "zod";

export const createFeedbackTicketSchema = z.object({
  type: z.enum(["bug", "feature", "question", "feedback"]),
  pagePath: z.string().min(1, "Page path is required"),
  description: z.string().min(1, "Description is required").max(5000),
});

export type CreateFeedbackTicketParams = z.infer<
  typeof createFeedbackTicketSchema
>;

export const updateTicketStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

export type UpdateTicketStatusParams = z.infer<
  typeof updateTicketStatusSchema
>;

export const addAdminNoteSchema = z.object({
  text: z.string().min(1, "Note text is required").max(2000),
});

export type AddAdminNoteParams = z.infer<typeof addAdminNoteSchema>;
