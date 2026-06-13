export type RawItemQueueBucket = "main" | "likely_non_inventory";

const NON_INVENTORY_KEYWORDS = [
  "fuel surcharge",
  "fuel levy",
  "delivery fee",
  "delivery charge",
  "freight",
  "cartage",
  "service charge",
  "account fee",
  "admin fee",
  "minimum order",
  "surcharge",
  "levy",
  "handling fee",
  "credit note",
  "adjustment",
  "payment due",
  "amount due",
  "balance brought forward",
  "statement total",
  "photography",
  "photograph",
  "photoshoot",
  "photo shoot",
  "videography",
  "video production",
  "image editing",
  "still image",
  "campaign",
  "graphic design",
  "graphics",
  "branding",
  "social media",
  "content creation",
  "logo design",
  "copywriting",
] as const;

const MEDIA_WORD_PATTERN = /\b(photography|photographs?|photoshoot|videography|videos?|images?|graphics?)\b/i;

/**
 * Units that indicate services / venue hire, not purchasable stock. Matched
 * token-by-token so compound units like "half day/hour" are still caught.
 */
const NON_INVENTORY_RAW_UNITS = new Set([
  "varied",
  "service",
  "services",
  "hour",
  "hours",
  "hr",
  "hrs",
  "fee",
  "fees",
  "lump sum",
  "ls",
  "day",
  "days",
  "session",
  "sessions",
  "booking",
  "bookings",
  "hire",
  "night",
  "nights",
]);

const STOCK_HINT_IN_DESCRIPTION =
  /\b(\d+\s*(kg|g|ml|l)\b|(kg|g|ml|l|box|bag|bunch|each|pkt|pack|tray|punnet|fillet|mince|tomato|garlic|onion|potato|carrot|lettuce|chicken|beef|pork|fish|cream|milk|cheese|bread|flour|rice)\b)/i;

/** Invoice header / metadata lines (not purchasable products). */
const NON_INVENTORY_PATTERNS = [
  /^invoice\s*no\.?\s*\d+\s*:\s*due\s+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s*$/i,
  /^invoice\s*no\.?\s*\d+\s*$/i,
  /^invoice\s*#?\s*\d+[\s:—-]+due\s+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s*$/i,
  /^inv(?:oice)?\.?\s*#?\s*\d+.*\bdue\b.*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/i,
  /^tax\s+invoice\s*(?:no\.?|#)?\s*\d+/i,
] as const;

function looksLikeInvoiceHeaderLine(description: string): boolean {
  const trimmed = description.trim();
  if (/^invoice\b/i.test(trimmed)) return true;
  if (/^tax\s+invoice\b/i.test(trimmed)) return true;
  if (/^inv\.?\s*no\.?\s*\d+/i.test(trimmed)) return true;
  return false;
}

function isPurelyNumericLine(description: string): boolean {
  return /^\d+(\.\d+)?$/.test(description.trim());
}

function isNonInventoryRawUnit(rawUnit: string | null | undefined): boolean {
  const unit = rawUnit?.trim().toLowerCase();
  if (!unit) return false;
  if (NON_INVENTORY_RAW_UNITS.has(unit)) return true;
  // Compound / slashed units such as "half day/hour" or "per hour".
  if (/\b(half|full)\s+day\b/.test(unit)) return true;
  const tokens = unit.split(/[^a-z]+/).filter(Boolean);
  return tokens.some((token) => NON_INVENTORY_RAW_UNITS.has(token));
}

/** Room / space bookings (e.g. "Room 204"), even when not purely numeric. */
function looksLikeRoomBookingLine(description: string): boolean {
  return /^room\s+\d+\b/i.test(description.trim());
}

/**
 * Venue / space labels on invoices (e.g. "The Library") — short "The …" titles
 * without product or pack hints.
 */
function looksLikeVenueSpaceLine(description: string): boolean {
  const trimmed = description.trim();
  if (!/^the\s+[a-z]/i.test(trimmed)) return false;
  if (/\d/.test(trimmed)) return false;
  if (STOCK_HINT_IN_DESCRIPTION.test(trimmed)) return false;

  const words = trimmed.split(/\s+/);
  return words.length >= 2 && words.length <= 4;
}

function looksLikeMediaServiceLine(description: string): boolean {
  if (MEDIA_WORD_PATTERN.test(description)) return true;
  const haystack = description.toLowerCase();
  for (const keyword of NON_INVENTORY_KEYWORDS) {
    if (
      keyword.includes("photo") ||
      keyword.includes("video") ||
      keyword.includes("image")
    ) {
      if (haystack.includes(keyword)) return true;
    }
  }
  return false;
}

export function classifyRawItemBucket(args: {
  rawDescription: string;
  rawUnit?: string | null;
}): RawItemQueueBucket {
  const description = args.rawDescription.trim();
  const haystack = `${description} ${args.rawUnit ?? ""}`.trim().toLowerCase();
  if (!haystack) return "main";

  if (isPurelyNumericLine(description)) {
    return "likely_non_inventory";
  }

  if (looksLikeRoomBookingLine(description)) {
    return "likely_non_inventory";
  }

  if (isNonInventoryRawUnit(args.rawUnit)) {
    return "likely_non_inventory";
  }

  if (looksLikeVenueSpaceLine(description)) {
    return "likely_non_inventory";
  }

  if (looksLikeInvoiceHeaderLine(description)) {
    return "likely_non_inventory";
  }

  if (looksLikeMediaServiceLine(description)) {
    return "likely_non_inventory";
  }

  for (const pattern of NON_INVENTORY_PATTERNS) {
    if (pattern.test(description)) {
      return "likely_non_inventory";
    }
  }

  for (const keyword of NON_INVENTORY_KEYWORDS) {
    if (haystack.includes(keyword)) {
      return "likely_non_inventory";
    }
  }

  return "main";
}
