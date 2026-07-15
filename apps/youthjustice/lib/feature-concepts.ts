import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  FolderOpen,
  Handshake,
  IdCard,
  Lock,
  MessageSquare,
  NotebookPen,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";

/**
 * Concept/ideation content for the /concepts page. Planning material only;
 * mirrors docs/feature-roadmap.md and is not wired to any real functionality.
 */

export type ConceptPhase = "P0" | "P1" | "P2";

export const PHASE_META: Record<
  ConceptPhase,
  { label: string; description: string; badgeClassName: string }
> = {
  P0: {
    label: "P0 · Demo",
    description: "Flesh out in the demo with dummy data",
    badgeClassName:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  P1: {
    label: "P1 · First build",
    description: "First real build once a backend exists",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  P2: {
    label: "P2 · Later",
    description: "Later phase, needs stakeholder input",
    badgeClassName:
      "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
};

export type ConceptFeature = {
  text: string;
  phase: ConceptPhase;
};

export type ConceptModule = {
  id: string;
  title: string;
  tagline: string;
  icon: LucideIcon;
  highlight?: boolean;
  features: ConceptFeature[];
};

export type ConceptPersona = {
  name: string;
  role: string;
  description: string;
  status: "current" | "agreed" | "future";
};

export const CONCEPT_PERSONAS: ConceptPersona[] = [
  {
    name: "Case worker",
    role: "Primary user today",
    description:
      "Manages a caseload of young people: logs contact, tracks obligations, prepares for court.",
    status: "current",
  },
  {
    name: "Young person",
    role: "Second role, agreed direction",
    description:
      "Sees their own case only, in simplified language: their calendar, their worker, their plan, their messages.",
    status: "agreed",
  },
  {
    name: "Team leader / unit manager",
    role: "Future persona",
    description:
      "Caseload oversight, approvals and reallocation. Design around it now, build later.",
    status: "future",
  },
  {
    name: "Carer & external stakeholders",
    role: "Future persona",
    description:
      "Consent-gated visibility for carers; scoped sharing (not accounts) for legal aid, school and health providers.",
    status: "future",
  },
];

export const CONCEPT_MODULES: ConceptModule[] = [
  {
    id: "case-overview",
    title: "Case Overview page",
    tagline:
      "A per-case landing page. Today the case root has no home and nav drops straight into Correspondence.",
    icon: IdCard,
    highlight: true,
    features: [
      {
        text: "Youth summary header: name, age, photo, region, allocated worker, case status chip",
        phase: "P0",
      },
      {
        text: "Order panel: order type, start/end dates, conditions, compliance state",
        phase: "P0",
      },
      {
        text: "Next-7-days strip pulling from the existing calendar data",
        phase: "P0",
      },
      {
        text: "Recent activity feed merging correspondence, meetings and notes",
        phase: "P0",
      },
      {
        text: "Quick actions: log contact, add note, schedule meeting, message the youth",
        phase: "P0",
      },
      {
        text: "Compliance snapshot: obligations met or missed, program attendance",
        phase: "P1",
      },
      {
        text: "Alerts banner: overdue plan review, court within 48h, missed appointment",
        phase: "P1",
      },
      {
        text: "Risk and needs assessment summary with review cycle dates",
        phase: "P2",
      },
    ],
  },
  {
    id: "case-notes",
    title: "Case notes & contact recording",
    tagline:
      "Correspondence today is a read-only log. Real youth justice work is contact recording.",
    icon: NotebookPen,
    features: [
      {
        text: "Log-contact flow: channel, who was present, summary, outcome, follow-up flag",
        phase: "P0",
      },
      {
        text: "Case notes with categories, pinned notes, author and timestamp",
        phase: "P0",
      },
      {
        text: "Follow-up tasks generated from notes, surfacing on dashboard and overview",
        phase: "P1",
      },
      {
        text: "Attempted-contact tracking as compliance evidence",
        phase: "P1",
      },
      {
        text: "Note templates per contact type; supervisor countersigning",
        phase: "P2",
      },
    ],
  },
  {
    id: "calendar",
    title: "Calendar & obligations",
    tagline:
      "Expand the existing calendar (Court / Meeting / Appointment) into an obligations engine.",
    icon: CalendarDays,
    features: [
      { text: "Month, week and agenda views", phase: "P0" },
      {
        text: "Event detail drawer: location, attendees, transport flag, notes",
        phase: "P0",
      },
      {
        text: "Recurring obligations: weekly reporting, curfew windows, program sessions",
        phase: "P1",
      },
      {
        text: "Attendance outcomes on events feeding the compliance snapshot",
        phase: "P1",
      },
      {
        text: "Youth-facing view in plain language with PWA push reminders",
        phase: "P1",
      },
      {
        text: "Court date sync from listings; transport booking requests",
        phase: "P2",
      },
    ],
  },
  {
    id: "meetings",
    title: "Meetings",
    tagline: "Currently a bare placeholder tab.",
    icon: Handshake,
    features: [
      {
        text: "Meeting list with type, status and attendees",
        phase: "P0",
      },
      {
        text: "Meeting detail: agenda, outcomes, actions, linked documents",
        phase: "P0",
      },
      {
        text: "Action items with owners and due dates flowing into tasks",
        phase: "P1",
      },
      {
        text: "Restorative justice and group conferencing workflow",
        phase: "P2",
      },
    ],
  },
  {
    id: "safety-plans",
    title: "Safety plans",
    tagline: "Currently a static document list; becomes a structured, living plan.",
    icon: Shield,
    features: [
      {
        text: "Structured plan: risks, warning signs, coping strategies, safe people, review date",
        phase: "P0",
      },
      {
        text: "Version history with overdue-review alerts",
        phase: "P0",
      },
      {
        text: "Youth co-authoring: the young person edits their strategies, worker approves",
        phase: "P1",
      },
      {
        text: "One-tap emergency contacts on the youth side",
        phase: "P1",
      },
      {
        text: "Crisis mode: distress button that notifies the worker and opens the plan",
        phase: "P2",
      },
    ],
  },
  {
    id: "support-contacts",
    title: "Support contacts",
    tagline: "From a flat list to a consent-aware directory.",
    icon: Users,
    features: [
      {
        text: "Structured directory: role, organisation, consent-to-contact status",
        phase: "P0",
      },
      {
        text: "Contact interaction history linked into correspondence",
        phase: "P1",
      },
      {
        text: "Information-sharing register: what was shared, with whom, under what authority",
        phase: "P2",
      },
    ],
  },
  {
    id: "messages",
    title: "Messages",
    tagline: "Demo threads exist per case; grow them into a safeguarded channel.",
    icon: MessageSquare,
    features: [
      {
        text: "Inbox filters, quick replies, promote a message to the case record",
        phase: "P0",
      },
      {
        text: "Youth-side messaging with availability hours, off-duty escalation, full retention",
        phase: "P1",
      },
      {
        text: "Reminder broadcasts generated from the calendar",
        phase: "P1",
      },
      {
        text: "Interpreter and plain-language support; read receipts",
        phase: "P2",
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard & reporting",
    tagline: "Worker first, then team leader oversight.",
    icon: BarChart3,
    features: [
      {
        text: "Real stat cards plus a needs-attention case list (missed appointments, upcoming court, overdue reviews)",
        phase: "P0",
      },
      {
        text: "My-day view: today's schedule across all cases",
        phase: "P1",
      },
      {
        text: "Caseload health: contact frequency vs required cadence per case",
        phase: "P1",
      },
      {
        text: "Team leader dashboard: allocation view, breach queue, CSV/PDF exports",
        phase: "P2",
      },
    ],
  },
  {
    id: "documents",
    title: "Documents",
    tagline: "Not present at all today; Safety Plans hints at it.",
    icon: FolderOpen,
    features: [
      {
        text: "Per-case library: court reports, assessments, consent forms, versioning",
        phase: "P1",
      },
      {
        text: "Visibility flags: worker-only vs shared-with-youth",
        phase: "P1",
      },
      {
        text: "Report builder: court report generated from recorded data, exported to PDF",
        phase: "P2",
      },
    ],
  },
  {
    id: "youth-app",
    title: "Youth-facing app",
    tagline:
      "The second role: same case-scoped infrastructure, single-case simplified shell.",
    icon: Smartphone,
    features: [
      {
        text: "My-plan home: next appointment, my worker card, my goals, safety plan access",
        phase: "P1",
      },
      {
        text: "My calendar with push reminders, my messages",
        phase: "P1",
      },
      {
        text: "Goals and achievements: plan goals as youth-visible progress, encouraging tone",
        phase: "P1",
      },
      {
        text: "Wellbeing check-in prompts, local service directory, education resources",
        phase: "P2",
      },
    ],
  },
  {
    id: "platform",
    title: "Cross-cutting platform",
    tagline: "The foundations any real build needs first.",
    icon: Lock,
    features: [
      {
        text: "Real schema and roles with RLS so a youth sees only their own case",
        phase: "P1",
      },
      {
        text: "Audit trail on every read and write of a case record",
        phase: "P1",
      },
      {
        text: "Notifications wired to real events, replacing the demo context",
        phase: "P1",
      },
      {
        text: "Offline-first for home visits with queued writes",
        phase: "P2",
      },
      {
        text: "Incident reporting with escalation; breach recommendation flow",
        phase: "P2",
      },
      {
        text: "Cultural safety: Koori Court pathway flags, liaison roles, interpreter needs",
        phase: "P2",
      },
    ],
  },
];

export const CONCEPT_BUILD_ORDER: { title: string; detail: string }[] = [
  {
    title: "Case Overview page on dummy data",
    detail: "Highest demo value, zero backend required",
  },
  {
    title: "Case notes + log-contact flow",
    detail: "Makes the demo feel like a working tool",
  },
  {
    title: "Meetings fleshed out + calendar event details",
    detail: "Completes the case-scoped tabs",
  },
  {
    title: "Structured safety plan + youth view mockup",
    detail: "The emotional centrepiece for any stakeholder demo",
  },
  {
    title: "Backend cutover",
    detail: "Schema, RLS for two roles, real notifications",
  },
];

export const CONCEPT_OPEN_QUESTIONS: string[] = [
  "Who is the actual customer: a government department, an NGO provider, or a pitch? This determines compliance depth (audit, information sharing, retention).",
  "Can the young person be a direct account holder, or does access need guardian consent gating?",
  "Does a case mean the young person overall or a specific order/episode? One youth can have sequential or concurrent orders.",
  "Any integration with existing state systems (court listings, case systems), or standalone?",
];
