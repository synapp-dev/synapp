import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import { deletePerson, updatePerson } from "@/lib/people/service";
import { PERSON_CIRCLES } from "@/entities/people/model/types";

const updatePersonSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    nickname: z.string().trim().max(100).nullish(),
    circles: z.array(z.enum(PERSON_CIRCLES)).max(PERSON_CIRCLES.length).optional(),
    birthdayMonth: z.number().int().min(1).max(12).nullish(),
    birthdayDay: z.number().int().min(1).max(31).nullish(),
    birthdayYear: z.number().int().min(1900).max(2100).nullish(),
    emails: z.array(z.string().trim().email()).max(10).optional(),
    phone: z.string().trim().max(50).nullish(),
    company: z.string().trim().max(200).nullish(),
    role: z.string().trim().max(200).nullish(),
    interests: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    bio: z.string().trim().max(5000).nullish(),
    facts: z.array(z.string().trim().min(1).max(1000)).max(200).optional(),
    touchBaseDays: z.number().int().min(1).max(365).nullish(),
    lastTouchAt: z.string().datetime().nullish(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Empty update" });

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", status: 401 } },
    { status: 401 }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const { personId } = await params;
  const parsed = updatePersonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: parsed.error.issues[0]?.message ?? "Invalid body" } },
      { status: 400 }
    );
  }

  try {
    const person = await updatePerson(supabase, personId, parsed.data);
    return NextResponse.json({ data: person, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: { message: err instanceof Error ? err.message : "Failed to update person" },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const { personId } = await params;
  try {
    await deletePerson(supabase, personId);
    return NextResponse.json({ data: { id: personId }, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: { message: err instanceof Error ? err.message : "Failed to delete person" },
      },
      { status: 500 }
    );
  }
}
