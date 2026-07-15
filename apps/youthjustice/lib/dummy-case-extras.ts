import { addDays, subDays } from "date-fns";

import { DUMMY_CASES, type DummyCase } from "@/lib/dummy-cases";
import type { CaseCalendarEvent } from "@/components/organisms/case-calendar-panel";

/**
 * Deterministic per-case demo content for the case tabs (notes, meetings,
 * safety plan, support contacts, documents, goals). Same approach as
 * dummy-case-profile.ts: everything derives from the case index and `now`
 * so each case looks distinct and dates always look current.
 */

function pick<T>(items: readonly T[], index: number): T {
  return items[((index % items.length) + items.length) % items.length]!;
}

function at(now: Date, dayOffset: number, hour: number, minute = 0): Date {
  const d = addDays(now, dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const WORKER_NAMES = ["Aisha Patel", "Michael Chen", "Joy Okafor"];

/* ------------------------------ Case notes ------------------------------ */

export type CaseNoteCategory = "Welfare" | "Compliance" | "Family" | "Education";

export type CaseNote = {
  id: string;
  category: CaseNoteCategory;
  channel: "Visit" | "Phone" | "SMS" | "Email" | "In-app" | "Note";
  summary: string;
  detail: string;
  worker: string;
  date: Date;
  pinned: boolean;
  followUp: string | null;
};

const NOTE_TEMPLATES: Omit<CaseNote, "id" | "worker" | "date" | "pinned">[] = [
  {
    category: "Compliance",
    channel: "Visit",
    summary: "Home visit completed, carer present",
    detail:
      "Attended the approved address. Young person engaged and settled. Carer raised transport difficulties for Thursday reporting.",
    followUp: "Arrange transport support for Thursday reporting",
  },
  {
    category: "Education",
    channel: "Phone",
    summary: "School reported improved attendance",
    detail:
      "Wellbeing coordinator confirmed four of five days attended this week. Positive engagement in the hands-on program stream.",
    followUp: null,
  },
  {
    category: "Welfare",
    channel: "Note",
    summary: "Young person disclosed sleep difficulties",
    detail:
      "Raised during check-in. Discussed strategies from the safety plan. GP referral discussed and agreed, carer to book.",
    followUp: "Confirm GP appointment was booked",
  },
  {
    category: "Family",
    channel: "Phone",
    summary: "Spoke with carer re weekend arrangements",
    detail:
      "Carer confirmed supervised family time went well on Saturday. No concerns raised. Next family meeting still on track.",
    followUp: null,
  },
  {
    category: "Compliance",
    channel: "SMS",
    summary: "Appointment reminder sent and confirmed",
    detail: "Reminder for tomorrow's supervision check-in. Young person replied confirming attendance.",
    followUp: null,
  },
  {
    category: "Welfare",
    channel: "Email",
    summary: "Court update forwarded to legal aid",
    detail: "Forwarded the updated court listing and case plan summary to the legal aid solicitor ahead of the mention.",
    followUp: null,
  },
  {
    category: "Education",
    channel: "In-app",
    summary: "Young person asked about TAFE taster day",
    detail: "Message received via the app. Provided details for the trades taster day and looped in the education liaison.",
    followUp: "Register interest for TAFE taster day",
  },
];

export function getDummyCaseNotes(
  slug: DummyCase["slug"],
  now: Date = new Date(),
): CaseNote[] {
  const index = DUMMY_CASES.findIndex((c) => c.slug === slug);
  if (index === -1) return [];
  const count = 5 + (index % 3);
  return Array.from({ length: count }, (_, i) => {
    const template = pick(NOTE_TEMPLATES, index + i);
    const date = at(now, -(1 + i * 2 + (index % 2)), 9 + ((index + i) % 8), (i * 17) % 60);
    return {
      ...template,
      id: `${slug}-note-${i}`,
      worker: pick(WORKER_NAMES, index + i),
      date,
      pinned: i === (index % count) && template.followUp !== null,
    };
  });
}

/* ------------------------------- Meetings ------------------------------- */

export type CaseMeetingAction = {
  text: string;
  owner: string;
  due: Date;
  done: boolean;
};

export type CaseMeeting = {
  id: string;
  type: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  date: Date;
  location: string;
  attendees: string[];
  agenda: string[];
  outcomes: string[];
  actions: CaseMeetingAction[];
};

const MEETING_TYPES = [
  "Case plan review",
  "Family meeting",
  "Professionals meeting",
  "Group conference",
];

const MEETING_LOCATIONS = [
  "Youth justice office",
  "Video call",
  "School meeting room",
  "Community centre",
];

export function getDummyCaseMeetings(
  slug: DummyCase["slug"],
  now: Date = new Date(),
): CaseMeeting[] {
  const index = DUMMY_CASES.findIndex((c) => c.slug === slug);
  if (index === -1) return [];
  const c = DUMMY_CASES[index]!;
  const firstName = c.displayName.split(" ")[0]!;
  const worker = pick(WORKER_NAMES, index);

  const defs: { offset: number; status: CaseMeeting["status"] }[] = [
    { offset: 3 + (index % 4), status: "Scheduled" },
    { offset: -(6 + (index % 5)), status: "Completed" },
    { offset: -(16 + (index % 6)), status: "Completed" },
    { offset: -(27 + (index % 4)), status: index % 5 === 3 ? "Cancelled" : "Completed" },
  ];

  return defs.map((def, i) => {
    const type = pick(MEETING_TYPES, index + i);
    const isFamily = type === "Family meeting";
    const completed = def.status === "Completed";
    return {
      id: `${slug}-meeting-${i}`,
      type,
      status: def.status,
      date: at(now, def.offset, 10 + ((index + i) % 5), i % 2 === 0 ? 0 : 30),
      location: pick(MEETING_LOCATIONS, index + i),
      attendees: [
        firstName,
        worker,
        ...(isFamily ? ["Carer"] : []),
        ...(type === "Professionals meeting"
          ? ["School wellbeing coordinator", "Legal aid solicitor"]
          : []),
        ...(type === "Group conference" ? ["Convenor", "Carer"] : []),
      ],
      agenda: [
        "Progress since last meeting",
        type === "Case plan review"
          ? "Review goals and order conditions"
          : "Strengthen supports around the young person",
        "Agree next steps and actions",
      ],
      outcomes: completed
        ? [
            "Progress acknowledged, engagement improving",
            i % 2 === 0
              ? "Education re-engagement remains the priority goal"
              : "Family time arrangements confirmed as working well",
          ]
        : [],
      actions: completed
        ? [
            {
              text: "Send updated case plan to all attendees",
              owner: worker,
              due: at(now, def.offset + 5, 17),
              done: def.offset + 5 < 0,
            },
            {
              text:
                i % 2 === 0
                  ? "Book education liaison catch-up"
                  : "Confirm next family time session",
              owner: worker,
              due: at(now, def.offset + 10, 17),
              done: def.offset + 10 < -2,
            },
          ]
        : [],
    };
  });
}

/* ------------------------------ Safety plan ----------------------------- */

export type SafetyPlanPerson = {
  name: string;
  relationship: string;
  phone: string;
};

export type SafetyPlan = {
  version: number;
  lastReviewed: Date;
  nextReview: Date;
  overdue: boolean;
  coAuthoredWithYouth: boolean;
  risks: string[];
  warningSigns: string[];
  copingStrategies: string[];
  safePeople: SafetyPlanPerson[];
  safePlaces: string[];
  history: { version: number; date: Date; author: string; note: string }[];
};

export function getDummySafetyPlan(
  slug: DummyCase["slug"],
  now: Date = new Date(),
): SafetyPlan | undefined {
  const index = DUMMY_CASES.findIndex((c) => c.slug === slug);
  if (index === -1) return undefined;
  const worker = pick(WORKER_NAMES, index);
  const version = 2 + (index % 3);
  // A third of cases demo the overdue-review alert state.
  const overdue = index % 3 === 2;
  const lastReviewed = subDays(now, overdue ? 100 + (index % 20) : 20 + (index % 40));
  const nextReview = addDays(lastReviewed, 90);

  return {
    version,
    lastReviewed,
    nextReview,
    overdue,
    coAuthoredWithYouth: index % 2 === 0,
    risks: [
      "Low mood after family conflict",
      "Peer pressure from former co-offenders",
      ...(index % 2 === 0 ? ["Substance use when unsupervised late at night"] : []),
    ],
    warningSigns: [
      "Stops replying to messages for more than a day",
      "Skips school without a reason",
      "Withdraws from sport and friends",
    ],
    copingStrategies: [
      "Call or message my worker",
      "Go for a run or to training",
      "Use the breathing exercise from the plan",
      "Stay at a safe place until things calm down",
    ],
    safePeople: [
      { name: "My worker", relationship: worker, phone: "0412 660 314" },
      { name: pick(["Nan", "Mum", "Uncle D", "Coach"], index), relationship: "Family / mentor", phone: "0455 102 998" },
      { name: "Kids Helpline", relationship: "24/7 support", phone: "1800 55 1800" },
    ],
    safePlaces: [
      pick(["Nan's place", "Home", "Aunty's place"], index),
      "Local PCYC",
      "School wellbeing room",
    ],
    history: Array.from({ length: version }, (_, i) => ({
      version: version - i,
      date: subDays(lastReviewed, i * 90),
      author: i === 0 ? worker : pick(WORKER_NAMES, index + i),
      note:
        i === 0
          ? "Reviewed with the young person, coping strategies updated"
          : i === 1
            ? "Safe people list updated after change in carer"
            : "Initial plan created at intake",
    })),
  };
}

/* --------------------------- Support contacts --------------------------- */

export type SupportContact = {
  id: string;
  name: string;
  role: string;
  organisation: string;
  phone: string;
  email: string;
  consentToContact: boolean;
  lastContact: Date | null;
};

const CONTACT_DEFS: Omit<SupportContact, "id" | "lastContact">[] = [
  {
    name: "Karen King",
    role: "Carer",
    organisation: "Family",
    phone: "0413 457 218",
    email: "karen.k@example.com",
    consentToContact: true,
  },
  {
    name: "Tom Rearden",
    role: "Legal aid solicitor",
    organisation: "Victoria Legal Aid",
    phone: "03 9269 0120",
    email: "trearden@vla.example.com",
    consentToContact: true,
  },
  {
    name: "Priya Sharma",
    role: "Wellbeing coordinator",
    organisation: "Local secondary college",
    phone: "03 8560 4410",
    email: "psharma@school.example.com",
    consentToContact: true,
  },
  {
    name: "Dr Sarah Nguyen",
    role: "GP",
    organisation: "Community health service",
    phone: "03 9877 2200",
    email: "reception@health.example.com",
    consentToContact: false,
  },
  {
    name: "Marcus Bell",
    role: "Aboriginal liaison officer",
    organisation: "Youth justice",
    phone: "0400 218 465",
    email: "mbell@yj.example.com",
    consentToContact: true,
  },
  {
    name: "Renee Carter",
    role: "AOD counsellor",
    organisation: "Youth support service",
    phone: "03 9410 7733",
    email: "rcarter@yss.example.com",
    consentToContact: false,
  },
];

export function getDummySupportContacts(
  slug: DummyCase["slug"],
  now: Date = new Date(),
): SupportContact[] {
  const index = DUMMY_CASES.findIndex((c) => c.slug === slug);
  if (index === -1) return [];
  const count = 4 + (index % 3);
  return Array.from({ length: count }, (_, i) => {
    const def = pick(CONTACT_DEFS, index + i);
    return {
      ...def,
      id: `${slug}-contact-${i}`,
      lastContact: i % 3 === 2 ? null : subDays(now, 2 + i * 4 + (index % 5)),
    };
  });
}

/* ------------------------------- Documents ------------------------------ */

export type CaseDocumentCategory =
  | "Court"
  | "Assessment"
  | "Consent"
  | "Plan"
  | "Report";

export type CaseDocument = {
  id: string;
  name: string;
  category: CaseDocumentCategory;
  version: number;
  updatedAt: Date;
  updatedBy: string;
  sharedWithYouth: boolean;
  sizeLabel: string;
};

const DOCUMENT_DEFS: Omit<CaseDocument, "id" | "updatedAt" | "updatedBy">[] = [
  {
    name: "Pre-sentence report",
    category: "Court",
    version: 2,
    sharedWithYouth: false,
    sizeLabel: "412 KB",
  },
  {
    name: "Case plan",
    category: "Plan",
    version: 3,
    sharedWithYouth: true,
    sizeLabel: "186 KB",
  },
  {
    name: "Risk and needs assessment",
    category: "Assessment",
    version: 1,
    sharedWithYouth: false,
    sizeLabel: "298 KB",
  },
  {
    name: "Safety plan (youth copy)",
    category: "Plan",
    version: 2,
    sharedWithYouth: true,
    sizeLabel: "94 KB",
  },
  {
    name: "Information sharing consent",
    category: "Consent",
    version: 1,
    sharedWithYouth: true,
    sizeLabel: "61 KB",
  },
  {
    name: "Education engagement report",
    category: "Report",
    version: 1,
    sharedWithYouth: false,
    sizeLabel: "154 KB",
  },
  {
    name: "Court outcome summary",
    category: "Court",
    version: 1,
    sharedWithYouth: true,
    sizeLabel: "77 KB",
  },
];

export function getDummyCaseDocuments(
  slug: DummyCase["slug"],
  now: Date = new Date(),
): CaseDocument[] {
  const index = DUMMY_CASES.findIndex((c) => c.slug === slug);
  if (index === -1) return [];
  const count = 5 + (index % 3);
  return Array.from({ length: count }, (_, i) => {
    const def = pick(DOCUMENT_DEFS, index + i);
    return {
      ...def,
      id: `${slug}-doc-${i}`,
      updatedAt: subDays(now, 1 + i * 6 + (index % 4)),
      updatedBy: pick(WORKER_NAMES, index + i),
    };
  });
}

/* --------------------------------- Goals -------------------------------- */

export type YouthGoal = {
  id: string;
  text: string;
  progressPercent: number;
};

const GOAL_DEFS = [
  "Get back to school four days a week",
  "Finish my community hours",
  "Keep every appointment this month",
  "Join the local footy team",
  "Save for my learner permit",
  "Finish the TAFE taster program",
];

export function getDummyYouthGoals(slug: DummyCase["slug"]): YouthGoal[] {
  const index = DUMMY_CASES.findIndex((c) => c.slug === slug);
  if (index === -1) return [];
  return Array.from({ length: 3 }, (_, i) => ({
    id: `${slug}-goal-${i}`,
    text: pick(GOAL_DEFS, index + i * 2),
    progressPercent: (25 + ((index * 13 + i * 37) % 70)) - ((index + i) % 2 ? 5 : 0),
  }));
}

/* --------------------------- Calendar (relative) ------------------------ */

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalIso(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${toLocalYmd(d)}T${h}:${min}:00`;
}

const CALENDAR_DEFS: { title: string; type: string; offset: number; hour: number }[] = [
  { title: "Supervision check-in", type: "Appointment", offset: 1, hour: 10 },
  { title: "Case plan review", type: "Meeting", offset: 3, hour: 14 },
  { title: "Children's Court mention", type: "Court", offset: 6, hour: 9 },
  { title: "Youth health appointment", type: "Appointment", offset: 8, hour: 11 },
  { title: "Family meeting", type: "Meeting", offset: 12, hour: 15 },
  { title: "Program session", type: "Appointment", offset: 15, hour: 16 },
  { title: "Supervision check-in", type: "Appointment", offset: -6, hour: 10 },
  { title: "Professionals meeting", type: "Meeting", offset: -13, hour: 13 },
  { title: "Children's Court mention", type: "Court", offset: -24, hour: 9 },
];

/** Relative-to-now calendar events so the calendar always demos with data. */
export function getDummyCaseCalendarEvents(
  slug: DummyCase["slug"],
  now: Date = new Date(),
): CaseCalendarEvent[] {
  const index = DUMMY_CASES.findIndex((c) => c.slug === slug);
  if (index === -1) return [];
  return CALENDAR_DEFS.map((def, i) => {
    const startsAt = at(
      now,
      def.offset + (index % 2 === 1 && i % 3 === 0 ? 1 : 0),
      def.hour,
      i % 2 === 0 ? 0 : 30,
    );
    return {
      id: `${slug}-cal-${i}`,
      title: def.title,
      date: toLocalYmd(startsAt),
      type: def.type,
      startsAt: toLocalIso(startsAt),
    };
  });
}
