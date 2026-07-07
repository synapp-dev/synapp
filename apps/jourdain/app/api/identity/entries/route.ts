import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import {
  IDENTITY_SECTIONS,
  type IdentitySection,
} from "@/entities/identity/model/types";
import {
  createEntry,
  listEntries,
  reorderEntries,
} from "@/lib/identity/service";

const extrasSchema = z
  .object({
    targetDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
      .nullish(),
    done: z.boolean().optional(),
  })
  .optional();

const createEntrySchema = z.object({
  section: z.enum(IDENTITY_SECTIONS),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(10000).nullish(),
  extras: extrasSchema,
});

const reorderSchema = z.object({
  section: z.enum(IDENTITY_SECTIONS),
  ids: z.array(z.string().uuid()).min(1).max(500),
});

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", status: 401 } },
    { status: 401 }
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const sectionParam = request.nextUrl.searchParams.get("section");
  const section = IDENTITY_SECTIONS.includes(sectionParam as IdentitySection)
    ? (sectionParam as IdentitySection)
    : undefined;

  try {
    const entries = await listEntries(supabase, section);
    return NextResponse.json({ data: entries, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to list entries",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const parsed = createEntrySchema.safeParse(
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
    const entry = await createEntry(supabase, user.id, parsed.data);
    return NextResponse.json({ data: entry, error: null }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to create entry",
        },
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const parsed = reorderSchema.safeParse(
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
    await reorderEntries(supabase, parsed.data.section, parsed.data.ids);
    return NextResponse.json({ data: { reordered: true }, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message:
            err instanceof Error ? err.message : "Failed to reorder entries",
        },
      },
      { status: 500 }
    );
  }
}
