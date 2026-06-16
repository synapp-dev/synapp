import { NextRequest } from "next/server";
import { z } from "zod";
import { deleteSession, getSession, updateSession } from "@/lib/gym/service";
import { badRequest, notFound, ok, requireUser, serverError } from "@/lib/gym/http";

const updateSchema = z
  .object({
    status: z.enum(["active", "completed"]).optional(),
    notes: z.string().trim().max(2000).nullish(),
    title: z.string().trim().min(1).max(200).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Empty update" });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { sessionId } = await params;
  try {
    const session = await getSession(auth.supabase, sessionId);
    return session ? ok(session) : notFound();
  } catch (err) {
    return serverError(err, "Failed to load session");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { sessionId } = await params;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }

  try {
    return ok(await updateSession(auth.supabase, sessionId, parsed.data));
  } catch (err) {
    return serverError(err, "Failed to update session");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { sessionId } = await params;
  try {
    await deleteSession(auth.supabase, sessionId);
    return ok({ id: sessionId });
  } catch (err) {
    return serverError(err, "Failed to delete session");
  }
}
