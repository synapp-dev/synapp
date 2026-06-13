/**
 * Minimal vCard 3.0 parser tuned for iCloud/iPhone contact exports.
 * Pure functions — safe to run client-side on the uploaded file text.
 */

export type VcardContact = {
  fullName: string;
  emails: string[];
  phone: string | null;
  company: string | null;
  role: string | null;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  birthdayYear: number | null;
};

// Apple uses year 1604 as a sentinel for "birthday with no year".
const APPLE_OMIT_YEAR = 1604;

function unescapeValue(value: string): string {
  return value
    .replaceAll("\\n", "\n")
    .replaceAll("\\,", ",")
    .replaceAll("\\;", ";")
    .replaceAll("\\\\", "\\");
}

function parseBday(value: string): {
  birthdayMonth: number | null;
  birthdayDay: number | null;
  birthdayYear: number | null;
} {
  const none = { birthdayMonth: null, birthdayDay: null, birthdayYear: null };
  const trimmed = value.trim();

  // Year-less forms: --MM-DD or --MMDD
  const yearless = trimmed.match(/^--(\d{2})-?(\d{2})$/);
  if (yearless) {
    return {
      birthdayMonth: Number(yearless[1]),
      birthdayDay: Number(yearless[2]),
      birthdayYear: null,
    };
  }

  // Dated forms: YYYY-MM-DD or YYYYMMDD
  const dated = trimmed.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (!dated) return none;
  const year = Number(dated[1]);
  return {
    birthdayMonth: Number(dated[2]),
    birthdayDay: Number(dated[3]),
    birthdayYear: year === APPLE_OMIT_YEAR ? null : year,
  };
}

function parseCard(lines: string[]): VcardContact | null {
  let fullName: string | null = null;
  let nameFallback: string | null = null;
  const emails: string[] = [];
  const phones: string[] = [];
  let company: string | null = null;
  let role: string | null = null;
  let birthday = {
    birthdayMonth: null as number | null,
    birthdayDay: null as number | null,
    birthdayYear: null as number | null,
  };

  for (const line of lines) {
    // e.g. "item1.EMAIL;TYPE=INTERNET:foo@bar.com" or "TEL;TYPE=CELL:+61..."
    const match = line.match(/^(?:item\d+\.)?([A-Za-z0-9-]+)((?:;[^:]*)?):(.*)$/);
    if (!match) continue;
    const prop = (match[1] ?? "").toUpperCase();
    const rawValue = match[3] ?? "";
    if (!rawValue) continue;

    switch (prop) {
      case "FN":
        fullName = unescapeValue(rawValue).trim();
        break;
      case "N": {
        // Last;First;Middle;Prefix;Suffix
        const parts = rawValue.split(";").map((part) => unescapeValue(part).trim());
        const assembled = [parts[1], parts[0]].filter(Boolean).join(" ");
        if (assembled) nameFallback = assembled;
        break;
      }
      case "EMAIL": {
        const email = unescapeValue(rawValue).trim().toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !emails.includes(email)) {
          emails.push(email);
        }
        break;
      }
      case "TEL": {
        const phone = unescapeValue(rawValue).trim();
        if (phone && !phones.includes(phone)) phones.push(phone);
        break;
      }
      case "ORG": {
        const org = unescapeValue(rawValue.split(";")[0] ?? "").trim();
        if (org) company = org;
        break;
      }
      case "TITLE":
        role = unescapeValue(rawValue).trim() || null;
        break;
      case "BDAY":
        birthday = parseBday(rawValue);
        break;
      default:
        break;
    }
  }

  const name = fullName || nameFallback;
  if (!name) return null;

  return {
    fullName: name,
    emails,
    phone: phones[0] ?? null,
    company,
    role,
    ...birthday,
  };
}

export function parseVcards(text: string): VcardContact[] {
  // Unfold continuation lines (RFC 2425: CRLF followed by space or tab).
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const contacts: VcardContact[] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    const upper = line.trim().toUpperCase();
    if (upper === "BEGIN:VCARD") {
      current = [];
      continue;
    }
    if (upper === "END:VCARD") {
      if (current) {
        const contact = parseCard(current);
        if (contact) contacts.push(contact);
      }
      current = null;
      continue;
    }
    current?.push(line);
  }

  return contacts;
}
