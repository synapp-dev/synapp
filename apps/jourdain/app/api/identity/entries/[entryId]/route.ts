import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestUser } from "@/lib/api/route-auth";
import { deleteEntry, updateEntry } from "@/lib/identity/service";

const extrasSchema = z.object({
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .nullish(),
  done: z.boolean().optional(),
});

const updateEntrySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().max(10000).nullish(),
  extras: extrasSchema.optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await params;
  const { supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const parsed = updateEntrySchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { message: parsed.error.issues[0]?.message ?? "Invalid body" },
      },
      { status: 400 }
    );
  }

  try {
    const entry = await updateEntry(supabase, entryId, parsed.data);
    return NextResponse.json({ data: entry, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to update entry",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await params;
  const { supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  try {
    await deleteEntry(supabase, entryId);
    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to delete entry",
        },
      },
      { status: 500 }
    );
  }
}
