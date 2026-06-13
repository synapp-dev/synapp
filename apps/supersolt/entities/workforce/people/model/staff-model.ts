export type SortField = "name" | "start_date";

export type StaffRoleTier = "manager" | "supervisor" | "crew" | "custom";
export type EmploymentType = "full-time" | "part-time" | "casual";
export type StaffStatus = "active" | "inactive";
export type OnboardingStatus = "roster_ready" | "invited" | "in_progress" | "pending_review";
export type ComplianceStatus = "green" | "amber" | "red";

export type StaffMember = {
  id: string;
  userOrganisationId?: string;
  name: string;
  email: string;
  phone?: string;
  roleTier: StaffRoleTier;
  roleSlug: string;
  roleDisplayName: string;
  grantsOrgAdmin: boolean;
  positionSlug: string | null;
  positionDisplayName: string | null;
  employmentType: EmploymentType;
  hourlyRateCents: number;
  startDate: string;
  status: StaffStatus;
  complianceStatus?: ComplianceStatus;
  needsSupersoltDetail?: boolean;
  onboardingStatus: OnboardingStatus;
  onboardingProgress: number;
  nextShift?: { day: string; time: string };
};

export type PeopleApiStaff = {
  id: string;
  userOrganisationId?: string;
  name: string;
  email: string;
  phone: string | null;
  roleSlug: string;
  roleDisplayName: string;
  grantsOrgAdmin: boolean;
  roleTier: StaffRoleTier;
  positionSlug: string | null;
  positionDisplayName: string | null;
  startDate: string;
  status: StaffStatus;
  employmentType?: string;
  complianceStatus?: ComplianceStatus;
  needsSupersoltDetail?: boolean;
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const MOCK_SHIFT_DAYS = ["Thu 20 Mar", "Fri 21 Mar", "Sat 22 Mar", "Sun 23 Mar", "Mon 24 Mar"];
const MOCK_SHIFT_TIMES = ["06:00–14:00", "08:00–16:00", "10:00–18:00", "14:00–22:00"];

function mapEmploymentType(raw?: string): EmploymentType {
  if (raw === "full_time") return "full-time";
  if (raw === "part_time") return "part-time";
  if (raw === "casual" || raw === "fixed_term") return "casual";
  return "casual";
}

export function enrichFromApiRow(row: PeopleApiStaff): StaffMember {
  const h = hashString(row.id);
  const onboardingStatuses: OnboardingStatus[] = [
    "roster_ready",
    "invited",
    "in_progress",
    "pending_review",
  ];
  const employmentType = mapEmploymentType(row.employmentType);
  const hourlyRateCents = 2600 + (h % 15) * 100;
  const onboardingStatus: OnboardingStatus =
    row.status === "inactive"
      ? "roster_ready"
      : (onboardingStatuses[h % onboardingStatuses.length] ?? "roster_ready");
  const onboardingProgress = row.status === "inactive" ? 100 : 20 + (h % 80);
  const shiftDay = MOCK_SHIFT_DAYS[h % MOCK_SHIFT_DAYS.length];
  const shiftTime = MOCK_SHIFT_TIMES[h % MOCK_SHIFT_TIMES.length];
  const nextShift =
    row.status === "active" && h % 4 !== 0 && shiftDay !== undefined && shiftTime !== undefined
      ? { day: shiftDay, time: shiftTime }
      : undefined;

  return {
    id: row.id,
    userOrganisationId: row.userOrganisationId,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    roleTier: row.roleTier,
    roleSlug: row.roleSlug,
    roleDisplayName: row.roleDisplayName,
    grantsOrgAdmin: row.grantsOrgAdmin,
    positionSlug: row.positionSlug,
    positionDisplayName: row.positionDisplayName,
    employmentType,
    hourlyRateCents,
    startDate: row.startDate.slice(0, 10),
    status: row.status,
    complianceStatus: row.complianceStatus,
    needsSupersoltDetail: row.needsSupersoltDetail,
    onboardingStatus,
    onboardingProgress,
    nextShift,
  };
}

export const ROLE_STYLES: Record<StaffRoleTier, string> = {
  manager: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  supervisor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  crew: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  custom: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

export const ROLE_BADGE_VARIANT: Record<StaffRoleTier, "default" | "secondary" | "outline"> = {
  manager: "default",
  supervisor: "secondary",
  crew: "outline",
  custom: "outline",
};

export { getInitials } from "@/lib/person/get-initials";

export function formatStartDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

export function formatHourlyRate(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function onboardingStatusLabel(status: OnboardingStatus): string {
  switch (status) {
    case "roster_ready":
      return "Roster ready";
    case "invited":
      return "Invited";
    case "in_progress":
      return "In progress";
    case "pending_review":
      return "Pending review";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export const COMPLIANCE_STRIP_LABEL: Record<ComplianceStatus, string> = {
  green: "Compliant",
  amber: "Needs attention",
  red: "Action required",
};
