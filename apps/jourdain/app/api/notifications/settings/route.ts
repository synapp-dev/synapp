import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestUser } from "@/lib/api/route-auth";
import type { NotificationSettings } from "@/entities/notifications/model/types";

const DEFAULTS: NotificationSettings = {
  dailyDigestEnabled: true,
  digestHour: 8,
  timezone: "UTC",
  lastDigestDate: null,
};

const updateSchema = z
  .object({
    dailyDigestEnabled: z.boolean().optional(),
    digestHour: z.number().int().min(0).max(23).optional(),
    timezone: z.string().min(1).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Empty update" });

type SettingsRow = {
  daily_digest_enabled: boolean;
  digest_hour: number;
  timezone: string;
  last_digest_date: string | null;
};

function toSettings(row: SettingsRow): NotificationSettings {
  return {
    dailyDigestEnabled: row.daily_digest_enabled,
    digestHour: row.digest_hour,
    timezone: row.timezone,
    lastDigestDate: row.last_digest_date,
  };
}

const SETTINGS_COLUMNS =
  "daily_digest_enabled, digest_hour, timezone, last_digest_date";

export async function GET() {
  const { user, supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const { data } = await supabase
    .from("notification_settings")
    .select(SETTINGS_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    data: data ? toSettings(data as SettingsRow) : DEFAULTS,
    error: null,
  });
}

export async function PATCH(request: NextRequest) {
  const { user, supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: parsed.error.issues[0]?.message ?? "Invalid body" } },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = { user_id: user.id };
  if (parsed.data.dailyDigestEnabled !== undefined) {
    patch.daily_digest_enabled = parsed.data.dailyDigestEnabled;
  }
  if (parsed.data.digestHour !== undefined) {
    patch.digest_hour = parsed.data.digestHour;
  }
  if (parsed.data.timezone !== undefined) {
    patch.timezone = parsed.data.timezone;
  }

  const { data, error: writeError } = await supabase
    .from("notification_settings")
    .upsert(patch, { onConflict: "user_id" })
    .select(SETTINGS_COLUMNS)
    .single();

  if (writeError) {
    return NextResponse.json(
      { data: null, error: { message: writeError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: toSettings(data as SettingsRow), error: null });
}
