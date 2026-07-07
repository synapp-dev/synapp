import { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";
import { weekStartOf } from "@/lib/scoring/weeks";
import type { Review } from "@/entities/reviews/model/types";

const weekStartField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "week_start must be YYYY-MM-DD")
  .refine((date) => weekStartOf(date) === date, {
    message: "week_start must be a Monday",
  });

const reflectionField = z.string().trim().max(10000).nullish();

const upsertSchema = z.object({
  weekStart: weekStartField,
  wins: reflectionField,
  challenges: reflectionField,
  focus: reflectionField,
});

type ReviewRow = {
  id: string;
  week_start: string;
  wins: string | null;
  challenges: string | null;
  focus: string | null;
  created_at: string;
  updated_at: string;
};

const REVIEW_COLUMNS =
  "id, week_start, wins, challenges, focus, created_at, updated_at";

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    weekStart: row.week_start,
    wins: row.wins,
    challenges: row.challenges,
    focus: row.focus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const parsed = weekStartField.safeParse(
    request.nextUrl.searchParams.get("week_start")
  );
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid week_start");
  }

  try {
    const { data, error } = await auth.supabase
      .from("reviews")
      .select(REVIEW_COLUMNS)
      .eq("week_start", parsed.data)
      .maybeSingle();
    if (error) throw new Error(error.message);

    return ok<Review | null>(data ? toReview(data as ReviewRow) : null);
  } catch (err) {
    return serverError(err, "Failed to load review");
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const parsed = upsertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }

  const { weekStart, wins, challenges, focus } = parsed.data;

  try {
    const { data, error } = await auth.supabase
      .from("reviews")
      .upsert(
        {
          user_id: auth.userId,
          week_start: weekStart,
          wins: wins || null,
          challenges: challenges || null,
          focus: focus || null,
        },
        { onConflict: "user_id,week_start" }
      )
      .select(REVIEW_COLUMNS)
      .single();
    if (error) throw new Error(error.message);

    return ok<Review>(toReview(data as ReviewRow));
  } catch (err) {
    return serverError(err, "Failed to save review");
  }
}
