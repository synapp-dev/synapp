import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import { createPerson, listPeople } from "@/lib/people/service";
import {
  PERSON_CIRCLES,
  type PersonCircle,
} from "@/entities/people/model/types";

const createPersonSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
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

  const circleParam = request.nextUrl.searchParams.get("circle");
  const circle = PERSON_CIRCLES.includes(circleParam as PersonCircle)
    ? (circleParam as PersonCircle)
    : undefined;

  try {
    const people = await listPeople(supabase, { circle });
    return NextResponse.json({ data: people, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: { message: err instanceof Error ? err.message : "Failed to list people" },
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

  const parsed = createPersonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: parsed.error.issues[0]?.message ?? "Invalid body" } },
      { status: 400 }
    );
  }

  try {
    const person = await createPerson(supabase, user.id, parsed.data);
    return NextResponse.json({ data: person, error: null }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: { message: err instanceof Error ? err.message : "Failed to create person" },
      },
      { status: 500 }
    );
  }
}
