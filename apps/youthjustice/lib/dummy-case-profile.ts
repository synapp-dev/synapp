import { addDays, differenceInYears, format, subDays } from "date-fns";

import { DUMMY_CASES, type DummyCase } from "@/lib/dummy-cases";

/**
 * Deterministic per-case profile content for the case overview page.
 * Everything derives from the case's index in DUMMY_CASES so each demo case
 * looks distinct without storing 30 hand-written profiles. Dates are generated
 * relative to `now` so the snapshot always demos with live-looking data.
 */

export type CaseAlert = {
  label: string;
  detail: string;
};

export type CaseOrderCondition = {
  text: string;
  status: "met" | "attention";
};

export type CaseProfile = {
  caseNumber: string;
  status: string;
  dateOfBirth: Date;
  age: number;
  gender: string;
  pronouns: string;
  ethnicity: string;
  culture: string | null;
  region: string;
  address: string;
  school: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  alerts: CaseAlert[];
  worker: {
    name: string;
    title: string;
    phone: string;
  };
  order: {
    type: string;
    court: string;
    startDate: Date;
    endDate: Date;
    progressPercent: number;
    conditions: CaseOrderCondition[];
  };
  upcomingEvents: {
    id: string;
    title: string;
    type: string;
    startsAt: Date;
    dayLabel: string;
  }[];
  recentActivity: {
    id: string;
    kind: string;
    summary: string;
    worker: string;
    date: Date;
  }[];
  checklist: {
    id: string;
    text: string;
    done: boolean;
  }[];
  attendance: {
    /** Consecutive attended appointments, counting back from the most recent. */
    streakCount: number;
    bestStreak: number;
    attendedLast90: number;
    scheduledLast90: number;
    /** Last scheduled appointments, oldest to newest. */
    recent: { attended: boolean }[];
  };
};

function pick<T>(items: readonly T[], index: number): T {
  return items[((index % items.length) + items.length) % items.length]!;
}

const GENDERS = { female: "Female", male: "Male" } as const;

const ETHNICITIES = [
  "Anglo-Australian",
  "Vietnamese-Australian",
  "Sudanese-Australian",
  "Pasifika (Samoan)",
  "Lebanese-Australian",
  "Anglo-Australian",
  "Maori",
  "Filipino-Australian",
];

const CULTURES: (string | null)[] = [
  "Aboriginal",
  null,
  null,
  "Torres Strait Islander",
  null,
  "Aboriginal and Torres Strait Islander",
  null,
  null,
];

const ALL_ALERTS: CaseAlert[] = [
  { label: "Suicide risk", detail: "Flagged at last risk review" },
  { label: "Self-harm risk", detail: "Monitor and record at each contact" },
  { label: "Risk of harm to others", detail: "Two-worker visits required" },
];

const WORKERS = [
  { name: "Aisha Patel", title: "Senior Case Worker", phone: "0412 660 314" },
  { name: "Michael Chen", title: "Case Worker", phone: "0433 218 907" },
  { name: "Joy Okafor", title: "Case Worker", phone: "0401 552 738" },
];

const ORDER_TYPES = [
  "Youth Supervision Order",
  "Probation Order",
  "Bail Supervision",
  "Parole Order",
];

const CONDITION_SETS: CaseOrderCondition[][] = [
  [
    { text: "Report to youth justice as directed", status: "met" },
    { text: "Attend school or approved program", status: "attention" },
    { text: "Reside at approved address", status: "met" },
    { text: "No contact with co-offenders", status: "met" },
  ],
  [
    { text: "Weekly supervision appointments", status: "met" },
    { text: "Curfew 8pm to 6am", status: "attention" },
    { text: "Engage with AOD counselling", status: "met" },
  ],
  [
    { text: "Report twice weekly", status: "met" },
    { text: "Attend group conferencing program", status: "met" },
    { text: "Reside at approved address", status: "met" },
    { text: "Non-association conditions", status: "attention" },
  ],
];

const STREETS = [
  "14 Banksia Court",
  "8/22 Wattle Street",
  "3 Coolabah Drive",
  "51 Merri Parade",
  "6 Yarra View Road",
  "19/4 Grevillea Walk",
];

const SCHOOLS = [
  "Local secondary college (Year 10)",
  "Flexible learning centre",
  "TAFE foundation program",
  "Not currently enrolled, re-engagement in progress",
  "Local secondary college (Year 9)",
];

const CONTACTS = [
  { name: "Karen King", relationship: "Mother" },
  { name: "Rose Whitfield", relationship: "Grandmother" },
  { name: "Daniel Aumua", relationship: "Uncle" },
  { name: "Leanne Prior", relationship: "Foster carer" },
  { name: "Samia Haddad", relationship: "Aunt" },
];

const EVENT_TEMPLATES = [
  { title: "Supervision check-in", type: "Appointment", inDays: 1, hour: 10 },
  { title: "Case plan review", type: "Meeting", inDays: 3, hour: 14 },
  { title: "Children's Court mention", type: "Court", inDays: 6, hour: 9 },
  { title: "Youth health appointment", type: "Appointment", inDays: 8, hour: 11 },
  { title: "Family meeting", type: "Meeting", inDays: 12, hour: 15 },
];

const ACTIVITY_TEMPLATES = [
  { kind: "Phone", summary: "Check-in call, youth engaged well", daysAgo: 1 },
  { kind: "Visit", summary: "Home visit completed, carer present", daysAgo: 3 },
  { kind: "Email", summary: "Court update forwarded to legal aid", daysAgo: 5 },
  { kind: "Note", summary: "School reported improved attendance", daysAgo: 8 },
  { kind: "SMS", summary: "Appointment reminder sent and confirmed", daysAgo: 11 },
];

const CHECKLIST_ITEMS = [
  "Initial assessment completed",
  "Case plan drafted",
  "Case plan approved by team leader",
  "School re-engagement referral sent",
  "Health assessment booked",
  "Family meeting held",
  "Restorative program enrolment",
];

function dayLabelFor(eventDate: Date, now: Date): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOf(eventDate).getTime() - startOf(now).getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return format(eventDate, "EEEE");
  return format(eventDate, "EEE d MMM");
}

function regionFromSubtitle(subtitle: string): string {
  const parts = subtitle.split("—");
  return (parts[1] ?? subtitle).trim();
}

export function getDummyCaseProfile(
  slug: DummyCase["slug"],
  now: Date = new Date(),
): CaseProfile | undefined {
  const index = DUMMY_CASES.findIndex((c) => c.slug === slug);
  if (index === -1) {
    return undefined;
  }
  const c = DUMMY_CASES[index]!;
  const region = regionFromSubtitle(c.subtitle);

  const isFemale = index === 0 || index % 2 === 1;
  const gender = isFemale ? GENDERS.female : GENDERS.male;
  const pronouns = isFemale ? "she/her" : "he/him";

  const birthYear = now.getFullYear() - (14 + (index % 4));
  const dateOfBirth = new Date(birthYear, (index * 3) % 12, ((index * 7) % 27) + 1);
  const age = differenceInYears(now, dateOfBirth);

  // Rebecca King carries every alert (matches the concept sketch); the rest
  // cycle through none / one / two so the demo shows each state.
  const alertCount = index === 0 ? 3 : index % 4 === 1 ? 0 : index % 4 === 2 ? 1 : 2;
  const alerts = ALL_ALERTS.slice(0, alertCount);

  const orderStart = subDays(now, 40 + ((index * 9) % 120));
  const orderLengthDays = 180 + (index % 4) * 90;
  const orderEnd = addDays(orderStart, orderLengthDays);
  const elapsedDays = Math.min(
    orderLengthDays,
    Math.max(0, Math.round((now.getTime() - orderStart.getTime()) / 86_400_000)),
  );
  const progressPercent = Math.round((elapsedDays / orderLengthDays) * 100);

  const upcomingEvents = EVENT_TEMPLATES.slice(0, 3 + (index % 3)).map(
    (template, i) => {
      const startsAt = addDays(now, template.inDays + (index % 2 === 1 && i > 0 ? 1 : 0));
      startsAt.setHours(template.hour, i % 2 === 0 ? 0 : 30, 0, 0);
      return {
        id: `${slug}-event-${i}`,
        title: template.title,
        type: template.type,
        startsAt,
        dayLabel: dayLabelFor(startsAt, now),
      };
    },
  );

  const recentActivity = ACTIVITY_TEMPLATES.map((template, i) => {
    const date = subDays(now, template.daysAgo + (index % 3 === 2 && i > 1 ? 1 : 0));
    date.setHours(9 + ((index + i) % 8), (i * 13) % 60, 0, 0);
    return {
      id: `${slug}-activity-${i}`,
      kind: template.kind,
      summary: template.summary,
      worker: pick(WORKERS, index + i).name,
      date,
    };
  });

  // Miss cadence varies per case; 0 means a clean record.
  const missEvery = pick([0, 4, 3, 6, 5], index);
  const recentAttendance = Array.from({ length: 10 }, (_, i) => ({
    attended: missEvery === 0 || (i + index) % missEvery !== 0,
  }));
  let streakCount = 0;
  for (let i = recentAttendance.length - 1; i >= 0; i -= 1) {
    if (!recentAttendance[i]!.attended) break;
    streakCount += 1;
  }
  let bestStreak = 0;
  let run = 0;
  for (const entry of recentAttendance) {
    run = entry.attended ? run + 1 : 0;
    bestStreak = Math.max(bestStreak, run);
  }
  const scheduledLast90 = 12 + (index % 5);
  const missedRecent = recentAttendance.filter((e) => !e.attended).length;
  const attendedLast90 = Math.max(0, scheduledLast90 - missedRecent - (index % 2));

  const doneCount = 2 + (index % 3);
  const checklist = CHECKLIST_ITEMS.map((text, i) => ({
    id: `${slug}-check-${i}`,
    text,
    done: i < doneCount,
  }));

  return {
    caseNumber: `YJ-${String(2400 + index * 7).padStart(4, "0")}`,
    status: alertCount >= 2 ? "Active, elevated monitoring" : "Active",
    dateOfBirth,
    age,
    gender,
    pronouns,
    ethnicity: pick(ETHNICITIES, index),
    culture: pick(CULTURES, index),
    region,
    address: `${pick(STREETS, index)}, ${region}`,
    school: pick(SCHOOLS, index),
    emergencyContact: {
      ...pick(CONTACTS, index),
      phone: `04${String((index * 37 + 13) % 100).padStart(2, "0")} ${String(
        (index * 211 + 457) % 1000,
      ).padStart(3, "0")} ${String((index * 577 + 218) % 1000).padStart(3, "0")}`,
    },
    alerts,
    worker: pick(WORKERS, index),
    order: {
      type: pick(ORDER_TYPES, index),
      court: `Children's Court, ${region.replace(", VIC", "")}`,
      startDate: orderStart,
      endDate: orderEnd,
      progressPercent,
      conditions: pick(CONDITION_SETS, index),
    },
    upcomingEvents,
    recentActivity,
    checklist,
    attendance: {
      streakCount,
      bestStreak,
      attendedLast90,
      scheduledLast90,
      recent: recentAttendance,
    },
  } satisfies CaseProfile;
}
