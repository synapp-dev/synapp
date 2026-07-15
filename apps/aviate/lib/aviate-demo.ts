/**
 * Demo data for the Aviate workforce modules (roster, payslips, leave,
 * availability).
 *
 * These screens are built to the Menzies Aviation design but the app has no
 * backing tables for them yet, so the UI is driven by this module. Each export
 * is shaped the way a real API response would be, so wiring the pages to
 * Supabase later is a matter of swapping the source, not rewriting the views.
 */

/** The station the signed-in duty manager is viewing. */
export const STATION = {
  name: "Melbourne Airport",
  iata: "MEL",
  terminal: "MEL Terminal 2",
} as const;

/**
 * The organisation the user belongs to. Used as a resilient fallback for the
 * org switcher before the `/api/organisations` data loads. `logoUrl` points at
 * the bundled asset until the logo is uploaded to Supabase storage, after
 * which `organisations.logo_url` takes over.
 */
export const ORG = {
  name: "Menzies Aviation",
  slug: "menzies",
  subtitle: "Ground Handling",
  logoUrl: "/brand/menzies.svg",
} as const;

/* -------------------------------------------------------------------------- */
/*  Roster                                                                     */
/* -------------------------------------------------------------------------- */

export type CrewRole = "ramp" | "cargo" | "passenger";

export type RosterStaff = {
  id: string;
  name: string;
  jobTitle: string;
  role: CrewRole;
  /** Seven entries, Mon → Sun. `null` means a day off. */
  shifts: (string | null)[];
};

export const ROLE_LABELS: Record<CrewRole, string> = {
  ramp: "Ramp Services",
  cargo: "Cargo Handling",
  passenger: "Passenger Services",
};

/** Solid swatch used in the legend / role dots. */
export const ROLE_DOT: Record<CrewRole, string> = {
  ramp: "bg-orange-500",
  cargo: "bg-sky-500",
  passenger: "bg-violet-500",
};

/** Tinted pill used for a worked shift cell. */
export const ROLE_PILL: Record<CrewRole, string> = {
  ramp: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/25",
  cargo:
    "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/25",
  passenger:
    "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/25",
};

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const OFF = null;

export const ROSTER_STAFF: RosterStaff[] = [
  {
    id: "s1",
    name: "John Kowalski",
    jobTitle: "Ramp Agent",
    role: "ramp",
    shifts: ["0600–1400", "0600–1400", OFF, "1400–2200", "1400–2200", OFF, OFF],
  },
  {
    id: "s2",
    name: "Marcus Vance",
    jobTitle: "Ramp Lead",
    role: "ramp",
    shifts: ["0600–1400", OFF, "0600–1400", OFF, "1400–2200", "1400–2200", OFF],
  },
  {
    id: "s3",
    name: "Sarah Jenkins",
    jobTitle: "Passenger Services",
    role: "passenger",
    shifts: ["0800–1600", "0800–1600", "0800–1600", OFF, OFF, "0800–1600", "0800–1600"],
  },
  {
    id: "s4",
    name: "Amir Patel",
    jobTitle: "Cargo Handler",
    role: "cargo",
    shifts: [OFF, "2200–0600", "2200–0600", "2200–0600", OFF, OFF, "2200–0600"],
  },
  {
    id: "s5",
    name: "Elena Rostova",
    jobTitle: "Passenger Services",
    role: "passenger",
    shifts: ["0800–1600", OFF, "0800–1600", "0800–1600", OFF, "0800–1600", "0800–1600"],
  },
  {
    id: "s6",
    name: "James MacLeod",
    jobTitle: "Ramp Agent",
    role: "ramp",
    shifts: ["1400–2200", "1400–2200", OFF, OFF, "0600–1400", "0600–1400", OFF],
  },
  {
    id: "s7",
    name: "Fatima Al-Sayed",
    jobTitle: "Cargo Dispatch",
    role: "cargo",
    shifts: [OFF, OFF, "0600–1400", "0600–1400", "0600–1400", "0600–1400", OFF],
  },
  {
    id: "s8",
    name: "Robert Taylor",
    jobTitle: "Ramp Agent",
    role: "ramp",
    shifts: ["1400–2200", OFF, "1400–2200", "1400–2200", OFF, OFF, "0600–1400"],
  },
];

export const ROSTER_DEPARTMENTS = [
  "Ground Handling",
  "Ramp Services",
  "Cargo Handling",
  "Passenger Services",
] as const;

export const ROSTER_LOCATIONS = [
  "LHR Terminal 2",
  "LHR Terminal 3",
  "LHR Terminal 5",
] as const;

/* -------------------------------------------------------------------------- */
/*  Payslips                                                                   */
/* -------------------------------------------------------------------------- */

export type PayslipLine = { label: string; amount: number };

export type PayStatus = "paid" | "processing";

export type Payslip = {
  id: string;
  period: string;
  gross: number;
  deductions: number;
  net: number;
  status: PayStatus;
  earnings: PayslipLine[];
  taxes: PayslipLine[];
};

export const PAYSLIPS: Payslip[] = [
  {
    id: "p1",
    period: "01 Jul – 15 Jul 2026",
    gross: 2450,
    deductions: 580,
    net: 1870,
    status: "paid",
    earnings: [
      { label: "Base Salary (75 hrs)", amount: 1875 },
      { label: "Overtime (12 hrs @ 1.5x)", amount: 450 },
      { label: "Weekend Premium", amount: 125 },
    ],
    taxes: [
      { label: "Income Tax (PAYG)", amount: 390 },
      { label: "Superannuation", amount: 190 },
    ],
  },
  {
    id: "p2",
    period: "16 Jun – 30 Jun 2026",
    gross: 2600,
    deductions: 620,
    net: 1980,
    status: "paid",
    earnings: [
      { label: "Base Salary (75 hrs)", amount: 1875 },
      { label: "Overtime (18 hrs @ 1.5x)", amount: 590 },
      { label: "Weekend Premium", amount: 135 },
    ],
    taxes: [
      { label: "Income Tax (PAYG)", amount: 415 },
      { label: "Superannuation", amount: 205 },
    ],
  },
  {
    id: "p3",
    period: "01 Jun – 15 Jun 2026",
    gross: 2350,
    deductions: 550,
    net: 1800,
    status: "paid",
    earnings: [
      { label: "Base Salary (75 hrs)", amount: 1875 },
      { label: "Overtime (9 hrs @ 1.5x)", amount: 340 },
      { label: "Weekend Premium", amount: 135 },
    ],
    taxes: [
      { label: "Income Tax (PAYG)", amount: 370 },
      { label: "Superannuation", amount: 180 },
    ],
  },
  {
    id: "p4",
    period: "16 May – 31 May 2026",
    gross: 2400,
    deductions: 560,
    net: 1840,
    status: "paid",
    earnings: [
      { label: "Base Salary (75 hrs)", amount: 1875 },
      { label: "Overtime (11 hrs @ 1.5x)", amount: 410 },
      { label: "Weekend Premium", amount: 115 },
    ],
    taxes: [
      { label: "Income Tax (PAYG)", amount: 378 },
      { label: "Superannuation", amount: 182 },
    ],
  },
  {
    id: "p5",
    period: "01 May – 15 May 2026",
    gross: 2750,
    deductions: 650,
    net: 2100,
    status: "paid",
    earnings: [
      { label: "Base Salary (75 hrs)", amount: 1875 },
      { label: "Overtime (22 hrs @ 1.5x)", amount: 720 },
      { label: "Weekend Premium", amount: 155 },
    ],
    taxes: [
      { label: "Income Tax (PAYG)", amount: 440 },
      { label: "Superannuation", amount: 210 },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Leave                                                                      */
/* -------------------------------------------------------------------------- */

export type LeaveType = "Annual Leave" | "Sick Leave" | "Personal Leave";

export type LeaveStatus = "approved" | "pending" | "declined";

export type LeaveBalance = { type: LeaveType; days: number; caption: string };

export type LeaveRequest = {
  id: string;
  type: LeaveType;
  range: string;
  days: number;
  status: LeaveStatus;
};

export const LEAVE_BALANCES: LeaveBalance[] = [
  { type: "Annual Leave", days: 12, caption: "Annual allocation" },
  { type: "Sick Leave", days: 8, caption: "Fully paid sick leave" },
  { type: "Personal Leave", days: 3, caption: "Compassionate / urgent" },
];

export const LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "l1",
    type: "Annual Leave",
    range: "12 Aug – 17 Aug 2026",
    days: 5,
    status: "approved",
  },
  {
    id: "l2",
    type: "Sick Leave",
    range: "02 Jul – 04 Jul 2026",
    days: 2,
    status: "approved",
  },
  {
    id: "l3",
    type: "Personal Leave",
    range: "20 – 21 Jul 2026",
    days: 1,
    status: "pending",
  },
  {
    id: "l4",
    type: "Annual Leave",
    range: "01 May – 04 May 2026",
    days: 3,
    status: "declined",
  },
];

export const LEAVE_TYPES: LeaveType[] = [
  "Annual Leave",
  "Sick Leave",
  "Personal Leave",
];

/* -------------------------------------------------------------------------- */
/*  Availability                                                               */
/* -------------------------------------------------------------------------- */

export type AvailabilityState = "available" | "partial" | "unavailable";

export type AvailabilityEntry = {
  id: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  label: string;
  state: AvailabilityState;
  /** Human note about the window, e.g. "All Day" or "Partial (from 14:00)". */
  window: string;
};

export const AVAILABILITY_ENTRIES: AvailabilityEntry[] = [
  {
    id: "a1",
    date: "2026-07-02",
    label: "Medical appointment",
    state: "unavailable",
    window: "All Day",
  },
  {
    id: "a2",
    date: "2026-07-08",
    label: "University class PM",
    state: "partial",
    window: "Partial (from 14:00)",
  },
  {
    id: "a3",
    date: "2026-07-14",
    label: "Family commitment",
    state: "unavailable",
    window: "All Day",
  },
];

/* -------------------------------------------------------------------------- */
/*  Shared status styling                                                      */
/* -------------------------------------------------------------------------- */

/** Soft coloured badge classes keyed by a semantic tone. */
export const STATUS_TONE = {
  positive:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  negative:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  neutral: "bg-muted text-muted-foreground",
} as const;

export function leaveStatusTone(status: LeaveStatus) {
  if (status === "approved") return STATUS_TONE.positive;
  if (status === "pending") return STATUS_TONE.warning;
  return STATUS_TONE.negative;
}

export function availabilityTone(state: AvailabilityState) {
  if (state === "partial") return STATUS_TONE.warning;
  if (state === "unavailable") return STATUS_TONE.neutral;
  return STATUS_TONE.positive;
}

/** AUD formatter matching the design ($2,450.00). */
export function aud(amount: number): string {
  return amount.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
}
