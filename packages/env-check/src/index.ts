export interface EnvCheckSpec {
  /** App name used to prefix log output, e.g. "supersolt". */
  appName: string;
  /** Vars that must be present and non-empty; the server refuses to start without them. */
  required?: string[];
  /** Vars that gate features; missing ones produce one grouped warning at boot. */
  recommended?: string[];
  /** Groups where at least one member must be present, e.g. [["SUPABASE_ADMIN_KEY", "SUPABASE_SERVICE_ROLE_KEY"]]. */
  oneOf?: string[][];
}

function isSet(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Validates env presence at server boot (call from instrumentation.ts).
 * Throws when required vars (or oneOf groups) are missing so misconfiguration
 * fails loudly at startup instead of surfacing as silent 401s or dead features.
 */
export function checkEnv(spec: EnvCheckSpec): void {
  const missingRequired = (spec.required ?? []).filter((name) => !isSet(name));
  const missingGroups = (spec.oneOf ?? []).filter(
    (group) => !group.some((name) => isSet(name))
  );
  const missingRecommended = (spec.recommended ?? []).filter(
    (name) => !isSet(name)
  );

  if (missingRecommended.length > 0) {
    console.warn(
      `[${spec.appName}] env-check: missing recommended env vars (features that need them will be degraded or disabled): ${missingRecommended.join(", ")}`
    );
  }

  if (missingRequired.length > 0 || missingGroups.length > 0) {
    const parts: string[] = [];
    if (missingRequired.length > 0) {
      parts.push(`missing required env vars: ${missingRequired.join(", ")}`);
    }
    for (const group of missingGroups) {
      parts.push(`need at least one of: ${group.join(" | ")}`);
    }
    throw new Error(`[${spec.appName}] env-check failed: ${parts.join("; ")}`);
  }

  console.info(`[${spec.appName}] env-check: ok`);
}
