import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestUser } from "@/lib/api/route-auth";
import { createPeopleBulk, listPeople } from "@/lib/people/service";
import { PERSON_CIRCLES } from "@/entities/people/model/types";

const importSchema = z.object({
  people: z
    .array(
      z.object({
        fullName: z.string().trim().min(1).max(200),
        circles: z.array(z.enum(PERSON_CIRCLES)).max(PERSON_CIRCLES.length).optional(),
        birthdayMonth: z.number().int().min(1).max(12).nullish(),
        birthdayDay: z.number().int().min(1).max(31).nullish(),
        birthdayYear: z.number().int().min(1900).max(2100).nullish(),
        emails: z.array(z.string().trim().email()).max(10).optional(),
        phone: z.string().trim().max(50).nullish(),
        company: z.string().trim().max(200).nullish(),
        role: z.string().trim().max(200).nullish(),
      })
    )
    .min(1)
    .max(2000),
});

export async function POST(request: NextRequest) {
  const { user, supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const parsed = importSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: parsed.error.issues[0]?.message ?? "Invalid body" } },
      { status: 400 }
    );
  }

  try {
    // Dedupe against existing people by exact name (case-insensitive) or any
    // shared email address.
    const existing = await listPeople(supabase);
    const existingNames = new Set(existing.map((p) => p.fullName.toLowerCase()));
    const existingEmails = new Set(
      existing.flatMap((p) => p.emails.map((e) => e.toLowerCase()))
    );

    const fresh = parsed.data.people.filter((candidate) => {
      if (existingNames.has(candidate.fullName.toLowerCase())) return false;
      return !(candidate.emails ?? []).some((email) =>
        existingEmails.has(email.toLowerCase())
      );
    });

    const imported = await createPeopleBulk(supabase, user.id, fresh);
    return NextResponse.json({
      data: {
        importedCount: imported.length,
        skippedCount: parsed.data.people.length - fresh.length,
        people: imported,
      },
      error: null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: { message: err instanceof Error ? err.message : "Import failed" },
      },
      { status: 500 }
    );
  }
}
