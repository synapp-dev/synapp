export type BulkEmailParseRow = { email: string; line: number };
export type BulkEmailParseError = { line: number; value: string; reason: string };

export function normalizeInviteEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidInviteEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
    if (!trimmed) continue;
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
