import { NextResponse } from "next/server";
import { z } from "zod";

import { parseAnthem } from "@/entities/players/lib/anthem";
import { requireRequestUser } from "@/lib/api/route-auth";

const bodySchema = z.object({
  url: z.string().trim().nullable(),
});

/**
 * Set or clear the current member's profile anthem (Spotify or SoundCloud track).
 * - Body `{ url }` with a valid track link → persists the canonical URL.
 * - Body `{ url: null }` or empty string → clears the anthem.
 * Ownership is enforced by RLS (`auth.uid() = user_id`); we only ever write the
 * caller's own row.
 */
export async function PATCH(request: Request) {
  const { user, supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { url } = parsed.data;

  let canonicalUrl: string | null = null;
  if (url) {
    const anthem = parseAnthem(url);
    if (!anthem) {
      return NextResponse.json(
        { error: "Paste a Spotify or SoundCloud track link" },
        { status: 422 },
      );
    }
    canonicalUrl = anthem.canonicalUrl;
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ anthem_url: canonicalUrl, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not save anthem" }, { status: 500 });
  }

  return NextResponse.json({ anthemUrl: canonicalUrl });
}
