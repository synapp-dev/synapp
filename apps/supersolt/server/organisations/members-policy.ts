import { PLATFORM_ROLE_IDS, type PlatformRoleSlug } from "@/lib/roles/platform-role-ids";

export const ASSIGNABLE_MEMBER_ROLE_SLUGS = [
  "admin",
  "manager",
  "crew",
] as const satisfies readonly PlatformRoleSlug[];

export type AssignableMemberRoleSlug = (typeof ASSIGNABLE_MEMBER_ROLE_SLUGS)[number];

export const INVITE_EXPIRY_DAYS = 14;

export type MemberListStatus = "active" | "pending" | "archived";

export type MemberListRow = {
  kind: "member" | "invite";
  id: string;
  userProfileId: string | null;
  name: string;
  email: string;
  roleSlug: string;
  roleDisplayName: string;
  venueIds: string[];
  status: MemberListStatus;
  positionDisplayName: string | null;
  expiresAt: string | null;
};

export function normalizeInviteEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidInviteEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isAssignableRoleSlug(value: string): value is AssignableMemberRoleSlug {
  return (ASSIGNABLE_MEMBER_ROLE_SLUGS as readonly string[]).includes(value);
}

export function normalizeAssignableRoleSlug(
  raw: string,
): AssignableMemberRoleSlug | null {
  const normalized = raw.trim().toLowerCase();
  return isAssignableRoleSlug(normalized) ? normalized : null;
}

export function inviteExpiresAtIso(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + INVITE_EXPIRY_DAYS);
  return d.toISOString();
}

export function isInviteExpired(expiresAt: string, now = new Date()): boolean {
  const ms = new Date(expiresAt).getTime();
  return Number.isNaN(ms) || ms <= now.getTime();
}

export function canArchiveMember(args: {
  roleId: string;
  ownerRoleId: string;
  activeOwnerCount: number;
}): boolean {
  if (args.roleId !== args.ownerRoleId) {
    return true;
  }
  return args.activeOwnerCount > 1;
}

export function canDemoteMember(args: {
  currentRoleId: string;
  newRoleId: string;
  ownerRoleId: string;
  activeOwnerCount: number;
}): boolean {
  if (args.currentRoleId !== args.ownerRoleId) {
    return true;
  }
  if (args.newRoleId === args.ownerRoleId) {
    return true;
  }
  return args.activeOwnerCount > 1;
}

export type BulkEmailParseRow = { email: string; line: number };
export type BulkEmailParseError = { line: number; value: string; reason: string };

export function parseBulkEmails(raw: string): {
  valid: BulkEmailParseRow[];
  errors: BulkEmailParseError[];
} {
  const valid: BulkEmailParseRow[] = [];
  const errors: BulkEmailParseError[] = [];
  const seen = new Set<string>();

  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = i + 1;
    const trimmed = lines[i]?.trim() ?? "";
    if (!trimmed) {
      continue;
    }
    const email = normalizeInviteEmail(trimmed);
    if (!isValidInviteEmail(email)) {
      errors.push({ line, value: trimmed, reason: "Invalid email format" });
      continue;
    }
    if (seen.has(email)) {
      errors.push({ line, value: trimmed, reason: "Duplicate email in paste" });
      continue;
    }
    seen.add(email);
    valid.push({ email, line });
  }

  return { valid, errors };
}

export function displayNameFromProfile(profile: {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  if (profile.fullName?.trim()) return profile.fullName.trim();
  const first = profile.firstName?.trim() ?? "";
  const last = profile.lastName?.trim() ?? "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return profile.email;
}

export function mergeMembersList(args: {
  members: MemberListRow[];
  invites: MemberListRow[];
}): MemberListRow[] {
  const rows: MemberListRow[] = [
    ...args.members.map((m) => ({ ...m, kind: "member" as const })),
    ...args.invites.map((i) => ({ ...i, kind: "invite" as const })),
  ];
  rows.sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email));
  return rows;
}

export const OWNER_ROLE_ID = PLATFORM_ROLE_IDS.owner;
