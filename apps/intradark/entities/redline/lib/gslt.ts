import "server-only";

/**
 * Named GSLT (Steam Game Server Login Token) references.
 *
 * The token itself is a secret and lives only in an env var — it is NEVER sent
 * to the client. The provision UI picks a reference by `id`; the create route
 * resolves that id to the actual token server-side (see `resolveGsltToken`) and
 * injects it as the server's `STEAM_ACC` env var.
 *
 * Today this is a small code registry backed by env vars. If we ever need many
 * accounts (or per-user tokens), promote it to a DB table with the same shape.
 */

type GsltRef = {
  id: string;
  label: string;
  description: string;
  /** Env var holding the actual token. */
  envVar: string;
};

const GSLT_REFS: GsltRef[] = [
  {
    id: "intradark",
    label: "Intradark account",
    description: "GSLT tied to the Intradark Steam account.",
    envVar: "REDLINE_TEST_GSLT",
  },
];

/** Client-safe metadata — id/label/description + whether the env var is set. Never the token. */
export type GsltRefMeta = {
  id: string;
  label: string;
  description: string;
  configured: boolean;
};

export function listGsltRefs(): GsltRefMeta[] {
  return GSLT_REFS.map((r) => ({
    id: r.id,
    label: r.label,
    description: r.description,
    configured: Boolean(process.env[r.envVar]?.trim()),
  }));
}

/** Resolve a ref id to its token, or null if unknown / its env var is unset. Server-only. */
export function resolveGsltToken(id: string): string | null {
  const ref = GSLT_REFS.find((r) => r.id === id);
  if (!ref) return null;
  return process.env[ref.envVar]?.trim() || null;
}
