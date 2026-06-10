/**
 * Pure identifier classification + canonical URL helpers for player profiles.
 *
 * Resolution order (see docs/features/players-directory-profiles/plan.md):
 *  - `@name`            -> intradark member username
 *  - 17-digit number    -> steamid64
 *  - steamcommunity URL -> extract id64 or vanity
 *  - bare word          -> ambiguous (try steam vanity, then faceit nickname)
 *
 * The actual DB / upstream lookups live in `resolve-server.ts`; this file is
 * pure so it can be unit-tested without a database.
 */

export type IdentifierKind = "username" | "steamid64" | "vanity" | "ambiguous";

export interface ClassifiedIdentifier {
  kind: IdentifierKind;
  /** Normalized value (handle without `@`, the id64 digits, or the vanity/word). */
  value: string;
}

const STEAMID64_RE = /^\d{17}$/;
const STEAM_PROFILES_ID_RE = /steamcommunity\.com\/profiles\/(\d{17})/i;
const STEAM_VANITY_URL_RE = /steamcommunity\.com\/id\/([^/?#]+)/i;

export function isSteamId64(input: string): boolean {
  return STEAMID64_RE.test(input.trim());
}

/**
 * Classify a raw identifier from the URL or search box into a kind + value.
 */
export function classifyIdentifier(rawInput: string): ClassifiedIdentifier {
  const input = decodeURIComponent(rawInput ?? "").trim();

  if (input.startsWith("@")) {
    return { kind: "username", value: input.slice(1).trim() };
  }

  if (isSteamId64(input)) {
    return { kind: "steamid64", value: input };
  }

  const idMatch = input.match(STEAM_PROFILES_ID_RE);
  if (idMatch?.[1]) {
    return { kind: "steamid64", value: idMatch[1] };
  }

  const vanityMatch = input.match(STEAM_VANITY_URL_RE);
  if (vanityMatch?.[1]) {
    return { kind: "vanity", value: decodeURIComponent(vanityMatch[1]) };
  }

  // Bare token: could be a steam vanity or a faceit nickname.
  return { kind: "ambiguous", value: input };
}

/**
 * Canonical profile path for a resolved player. Linked intradark members get
 * the `@username` URL; everyone else is keyed by steamid64.
 */
export function canonicalPath(
  steamid64: string,
  linkedUsername?: string | null,
): string {
  if (linkedUsername && linkedUsername.trim()) {
    return `/players/@${linkedUsername.trim()}`;
  }
  return `/players/${steamid64}`;
}

export interface ResolveLookups {
  /** username -> steamid64 (from user_profiles join steam_profiles), or null. */
  byUsername: (username: string) => Promise<string | null>;
  /** steam vanity -> steamid64 via Steam Web API, or null. */
  byVanity: (vanity: string) => Promise<string | null>;
  /** faceit nickname -> steamid64 via Faceit Data API, or null. */
  byFaceitNickname: (nickname: string) => Promise<string | null>;
}

export interface ResolvedPlayer {
  steamid64: string;
  /** How the input was resolved. */
  via: IdentifierKind;
}

/**
 * Resolve any supported identifier to a steamid64 using injected lookups.
 * Returns null when nothing matches.
 */
export async function resolveToSteamId64(
  rawInput: string,
  lookups: ResolveLookups,
): Promise<ResolvedPlayer | null> {
  const { kind, value } = classifyIdentifier(rawInput);
  if (!value) return null;

  switch (kind) {
    case "steamid64":
      return { steamid64: value, via: "steamid64" };

    case "username": {
      const id = await lookups.byUsername(value);
      return id ? { steamid64: id, via: "username" } : null;
    }

    case "vanity": {
      const id = await lookups.byVanity(value);
      return id ? { steamid64: id, via: "vanity" } : null;
    }

    case "ambiguous": {
      const viaVanity = await lookups.byVanity(value);
      if (viaVanity) return { steamid64: viaVanity, via: "vanity" };
      const viaFaceit = await lookups.byFaceitNickname(value);
      if (viaFaceit) return { steamid64: viaFaceit, via: "ambiguous" };
      return null;
    }

    default:
      return null;
  }
}
