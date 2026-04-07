/**
 * Seeds demo auth users + org/venue memberships for every active venue.
 * Requires SUPABASE_SERVICE_ROLE_KEY and URL (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL).
 * Run from apps/supersolt: pnpm seed:demo-people
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mondayThisWeekInVenue, shiftBoundsUtc, venueWeekRangeUtc } from "@/lib/roster/venue-time";
import { PLATFORM_ROLE_IDS } from "@/lib/roles/platform-role-ids";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

const DEMO_DOMAIN = "supersoltdemo.com";

type DemoRosterRole = "manager" | "supervisor" | "crew";

const ROSTER: {
  first: string;
  last: string;
  role: DemoRosterRole;
  /** Venue `positions.slug` (roster station, not app permission). */
  positionSlug: string;
  phone: string;
}[] = [
  { first: "Alex", last: "Chen", role: "manager", positionSlug: "chef", phone: "0412 345 678" },
  { first: "Olivia", last: "Kim", role: "supervisor", positionSlug: "manager", phone: "0423 456 789" },
  { first: "Jack", last: "Morrison", role: "supervisor", positionSlug: "sous", phone: "0434 567 890" },
  { first: "Sam", last: "Taylor", role: "crew", positionSlug: "sous", phone: "0434 567 891" },
  { first: "Jordan", last: "Lee", role: "crew", positionSlug: "cdp", phone: "0445 678 901" },
  { first: "Mia", last: "Roberts", role: "crew", positionSlug: "foh", phone: "0445 678 902" },
  { first: "Noah", last: "Patel", role: "crew", positionSlug: "bar", phone: "0456 789 012" },
  { first: "Ella", last: "Wang", role: "crew", positionSlug: "host", phone: "0456 789 013" },
];

/**
 * Recurring weekly availability per `ROSTER` index (`day_of_week` 0 = Mon … 6 = Sun).
 * Restaurant-style mix: some weekday-only, some Thu–Sun bar, some weekend FOH, etc.
 */
const DEMO_WEEKLY_AVAILABILITY: boolean[][] = [
  // 0 Alex Chen — chef: Thu + Sun off
  [true, true, true, false, true, true, false],
  // 1 Olivia Kim — manager: Mon–Fri only
  [true, true, true, true, true, false, false],
  // 2 Jack Morrison — sous: Wed + Sat off; Sun on (matches shift seed)
  [true, true, false, true, true, false, true],
  // 3 Sam Taylor — sous: Mon + Wed + Sun off
  [false, true, false, true, true, true, false],
  // 4 Jordan Lee — CDP: Tue + Fri + Sun off
  [true, false, true, true, false, true, false],
  // 5 Mia Roberts — FOH: Mon + Thu off; strong weekend
  [false, true, true, false, true, true, true],
  // 6 Noah Patel — bar: Thu–Sun only
  [false, false, false, true, true, true, true],
  // 7 Ella Wang — host: Mon + Wed + Thu off; Fri–Sun + Tue
  [false, true, false, false, true, true, true],
];

/** Demo shifts: `rosterIndex` matches `ROSTER` order for this venue. */
const DEMO_SHIFT_SEED: {
  rosterIndex: number;
  dayIndex: number;
  start: string;
  end: string;
  positionSlug: string;
  breakMins: number;
}[] = [
  { rosterIndex: 0, dayIndex: 0, start: "06:00:00", end: "14:00:00", positionSlug: "chef", breakMins: 30 },
  { rosterIndex: 0, dayIndex: 1, start: "06:00:00", end: "14:00:00", positionSlug: "chef", breakMins: 30 },
  { rosterIndex: 0, dayIndex: 2, start: "06:00:00", end: "14:00:00", positionSlug: "chef", breakMins: 30 },
  { rosterIndex: 0, dayIndex: 4, start: "14:00:00", end: "22:00:00", positionSlug: "chef", breakMins: 30 },
  { rosterIndex: 0, dayIndex: 5, start: "14:00:00", end: "22:00:00", positionSlug: "chef", breakMins: 30 },
  { rosterIndex: 3, dayIndex: 0, start: "07:00:00", end: "15:00:00", positionSlug: "sous", breakMins: 30 },
  { rosterIndex: 3, dayIndex: 1, start: "14:00:00", end: "22:00:00", positionSlug: "sous", breakMins: 30 },
  { rosterIndex: 3, dayIndex: 3, start: "07:00:00", end: "15:00:00", positionSlug: "sous", breakMins: 30 },
  { rosterIndex: 3, dayIndex: 4, start: "07:00:00", end: "15:00:00", positionSlug: "sous", breakMins: 30 },
  { rosterIndex: 3, dayIndex: 6, start: "14:00:00", end: "22:00:00", positionSlug: "sous", breakMins: 30 },
  { rosterIndex: 4, dayIndex: 0, start: "10:00:00", end: "18:00:00", positionSlug: "cdp", breakMins: 30 },
  { rosterIndex: 4, dayIndex: 2, start: "10:00:00", end: "18:00:00", positionSlug: "cdp", breakMins: 30 },
  { rosterIndex: 4, dayIndex: 3, start: "14:00:00", end: "22:00:00", positionSlug: "cdp", breakMins: 30 },
  { rosterIndex: 4, dayIndex: 5, start: "10:00:00", end: "18:00:00", positionSlug: "cdp", breakMins: 30 },
  { rosterIndex: 5, dayIndex: 1, start: "11:00:00", end: "15:00:00", positionSlug: "foh", breakMins: 0 },
  { rosterIndex: 5, dayIndex: 2, start: "17:00:00", end: "22:00:00", positionSlug: "foh", breakMins: 0 },
  { rosterIndex: 5, dayIndex: 4, start: "17:00:00", end: "22:00:00", positionSlug: "foh", breakMins: 0 },
  { rosterIndex: 5, dayIndex: 5, start: "11:00:00", end: "22:00:00", positionSlug: "foh", breakMins: 30 },
  { rosterIndex: 5, dayIndex: 6, start: "11:00:00", end: "22:00:00", positionSlug: "foh", breakMins: 30 },
  { rosterIndex: 6, dayIndex: 3, start: "16:00:00", end: "23:00:00", positionSlug: "bar", breakMins: 30 },
  { rosterIndex: 6, dayIndex: 4, start: "16:00:00", end: "23:00:00", positionSlug: "bar", breakMins: 30 },
  { rosterIndex: 6, dayIndex: 5, start: "16:00:00", end: "00:00:00", positionSlug: "bar", breakMins: 30 },
  { rosterIndex: 6, dayIndex: 6, start: "16:00:00", end: "00:00:00", positionSlug: "bar", breakMins: 30 },
  { rosterIndex: 7, dayIndex: 4, start: "17:00:00", end: "22:00:00", positionSlug: "host", breakMins: 0 },
  { rosterIndex: 7, dayIndex: 5, start: "17:00:00", end: "23:00:00", positionSlug: "host", breakMins: 0 },
  { rosterIndex: 7, dayIndex: 6, start: "17:00:00", end: "23:00:00", positionSlug: "host", breakMins: 0 },
  { rosterIndex: 1, dayIndex: 0, start: "08:00:00", end: "16:00:00", positionSlug: "manager", breakMins: 30 },
  { rosterIndex: 1, dayIndex: 1, start: "08:00:00", end: "16:00:00", positionSlug: "manager", breakMins: 30 },
  { rosterIndex: 1, dayIndex: 2, start: "08:00:00", end: "16:00:00", positionSlug: "manager", breakMins: 30 },
  { rosterIndex: 1, dayIndex: 3, start: "08:00:00", end: "16:00:00", positionSlug: "manager", breakMins: 30 },
  { rosterIndex: 1, dayIndex: 4, start: "08:00:00", end: "16:00:00", positionSlug: "manager", breakMins: 30 },
];

function addDaysIso(isoDate: string, days: number): string {
  const parts = isoDate.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
}

function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ""
  );
}

function getServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

async function main() {
  const url = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();
  const password =
    process.env.DEMO_USER_PASSWORD?.trim() || "SupersoltDemo2026!";

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: venueRows, error: venueError } = await admin
    .from("venues")
    .select(
      `
      id,
      slug,
      organisation_id,
      name,
      timezone,
      organisations ( slug )
    `
    )
    .eq("is_active", true)
    .is("archived_at", null);

  if (venueError) {
    console.error("Failed to list venues:", venueError.message);
    process.exit(1);
  }

  const venues = (venueRows ?? []) as {
    id: string;
    slug: string;
    organisation_id: string;
    name: string;
    timezone: string;
    organisations: { slug: string } | { slug: string }[] | null;
  }[];

  const activeVenues = venues.filter((v) => v.id && v.slug && v.organisation_id);

  if (activeVenues.length === 0) {
    console.log("No venues found. Create organisations/venues first.");
    return;
  }

  let createdUsers = 0;
  let linkedMemberships = 0;

  for (const venue of activeVenues) {
    const orgSlug = Array.isArray(venue.organisations)
      ? venue.organisations[0]?.slug
      : venue.organisations?.slug;
    const orgSlugSafe = slugPart(orgSlug ?? "org");
    const venueSlugSafe = slugPart(venue.slug);

    for (const person of ROSTER) {
      const local = `${slugPart(person.first)}.${slugPart(person.last)}.${venueSlugSafe}.${orgSlugSafe}`;
      const email = `${local}@${DEMO_DOMAIN}`;
      const fullName = `${person.first} ${person.last}`;

      let userId: string | null = null;

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: person.first,
          last_name: person.last,
          full_name: fullName,
        },
      });

      if (createError) {
        const msg = createError.message.toLowerCase();
        if (msg.includes("already") || msg.includes("registered")) {
          const { data: profile } = await admin
            .from("user_profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          userId = profile?.id ?? null;
        } else {
          console.error(`createUser failed (${email}):`, createError.message);
          continue;
        }
      } else if (created.user) {
        userId = created.user.id;
        createdUsers += 1;
      }

      if (!userId) {
        console.warn(`Could not resolve user id for ${email}`);
        continue;
      }

      await admin
        .from("user_profiles")
        .update({ phone: person.phone, updated_at: new Date().toISOString() })
        .eq("id", userId);

      const { data: existingUo } = await admin
        .from("user_organisations")
        .select("id")
        .eq("user_profile_id", userId)
        .eq("organisation_id", venue.organisation_id)
        .is("archived_at", null)
        .maybeSingle();

      let userOrganisationId = existingUo?.id as string | undefined;

      const orgRoleId = PLATFORM_ROLE_IDS[person.role];
      const venueRoleId =
        person.role === "manager" || person.role === "supervisor" ? orgRoleId : null;

      if (!userOrganisationId) {
        const { data: insertedUo, error: uoError } = await admin
          .from("user_organisations")
          .insert({
            user_profile_id: userId,
            organisation_id: venue.organisation_id,
            role_id: orgRoleId,
            is_active: true,
            joined_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (uoError) {
          console.error(`user_organisations insert (${email}):`, uoError.message);
          continue;
        }
        userOrganisationId = insertedUo?.id;
        linkedMemberships += 1;
      } else {
        await admin
          .from("user_organisations")
          .update({
            role_id: orgRoleId,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userOrganisationId);
      }

      if (!userOrganisationId) continue;

      const { data: existingUv } = await admin
        .from("user_venues")
        .select("id")
        .eq("user_organisation_id", userOrganisationId)
        .eq("venue_id", venue.id)
        .is("archived_at", null)
        .maybeSingle();

      let uvId: string | null = null;
      if (existingUv?.id) {
        uvId = existingUv.id;
        await admin
          .from("user_venues")
          .update({
            role_id: venueRoleId,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", uvId);
      } else {
        const { data: insertedUv, error: uvError } = await admin
          .from("user_venues")
          .insert({
            user_organisation_id: userOrganisationId,
            organisation_id: venue.organisation_id,
            venue_id: venue.id,
            role_id: venueRoleId,
            is_active: true,
          })
          .select("id")
          .single();
        if (uvError) {
          console.error(`user_venues insert (${email} @ ${venue.slug}):`, uvError.message);
        } else {
          uvId = insertedUv?.id ?? null;
        }
      }

      if (uvId) {
        const { data: posRow } = await admin
          .from("positions")
          .select("id")
          .eq("venue_id", venue.id)
          .eq("slug", person.positionSlug)
          .is("archived_at", null)
          .maybeSingle();

        await admin
          .from("user_venues")
          .update({
            default_position_id: posRow?.id ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", uvId);
      }
    }

    const tz = venue.timezone || "UTC";
    const monday = mondayThisWeekInVenue(tz);
    const { startUtc, endExclusiveUtc } = venueWeekRangeUtc(monday, tz);
    await admin
      .from("roster_shifts")
      .delete()
      .eq("venue_id", venue.id)
      .lt("starts_at", endExclusiveUtc.toISOString())
      .gt("ends_at", startUtc.toISOString());

    const { data: posRows } = await admin
      .from("positions")
      .select("id, slug")
      .eq("venue_id", venue.id)
      .is("archived_at", null);
    const posBySlug = new Map((posRows ?? []).map((p) => [p.slug, p.id]));

    const profileIdByRosterIndex: (string | null)[] = [];
    for (const p of ROSTER) {
      const local = `${slugPart(p.first)}.${slugPart(p.last)}.${venueSlugSafe}.${orgSlugSafe}`;
      const em = `${local}@${DEMO_DOMAIN}`;
      const { data: prof } = await admin.from("user_profiles").select("id").eq("email", em).maybeSingle();
      profileIdByRosterIndex.push(prof?.id ?? null);
    }

    const rowsToInsert: Array<{
      organisation_id: string;
      venue_id: string;
      user_profile_id: string;
      starts_at: string;
      ends_at: string;
      position_id: string;
      break_minutes: number;
      lifecycle: "published";
      source: "manual";
    }> = [];

    for (const s of DEMO_SHIFT_SEED) {
      const uid = profileIdByRosterIndex[s.rosterIndex];
      const positionId = posBySlug.get(s.positionSlug);
      if (!uid || !positionId) continue;
      const shiftDate = addDaysIso(monday, s.dayIndex);
      const { startsAt, endsAt } = shiftBoundsUtc(shiftDate, s.start, s.end, tz);
      rowsToInsert.push({
        organisation_id: venue.organisation_id,
        venue_id: venue.id,
        user_profile_id: uid,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        position_id: positionId,
        break_minutes: s.breakMins,
        lifecycle: "published",
        source: "manual",
      });
    }

    if (rowsToInsert.length > 0) {
      const { error: shiftErr } = await admin.from("roster_shifts").insert(rowsToInsert);
      if (shiftErr) {
        console.error(`roster_shifts seed (${venue.slug}):`, shiftErr.message);
      }
    }

    const availabilityRows: Array<{
      organisation_id: string;
      venue_id: string;
      user_profile_id: string;
      day_of_week: number;
      is_available: boolean;
    }> = [];
    for (let ri = 0; ri < profileIdByRosterIndex.length; ri += 1) {
      const uid = profileIdByRosterIndex[ri];
      if (!uid) continue;
      const week = DEMO_WEEKLY_AVAILABILITY[ri];
      if (!week || week.length !== 7) continue;
      for (let d = 0; d < 7; d += 1) {
        availabilityRows.push({
          organisation_id: venue.organisation_id,
          venue_id: venue.id,
          user_profile_id: uid,
          day_of_week: d,
          is_available: week[d]!,
        });
      }
    }
    if (availabilityRows.length > 0) {
      const { error: avErr } = await admin.from("venue_staff_weekly_availability").upsert(availabilityRows, {
        onConflict: "venue_id,user_profile_id,day_of_week",
      });
      if (avErr) {
        console.error(`venue_staff_weekly_availability seed (${venue.slug}):`, avErr.message);
      }
    }

    console.log(`Seeded roster for venue "${venue.name}" (${venue.slug})`);
  }

  console.log(`Done. New auth users created: ${createdUsers}. New org memberships: ${linkedMemberships}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
