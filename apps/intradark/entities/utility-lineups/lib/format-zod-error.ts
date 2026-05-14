import type { ZodError } from "zod";

/** Human-readable validation message for server action responses (path + message per issue). */
export function formatZodErrorForClient(error: ZodError, maxLength = 2000): string {
  const parts = error.issues.map((issue) => {
    const path = issue.path.filter((p) => p !== undefined && p !== "").join(".") || "root";
    return `${path}: ${issue.message}`;
  });
  const joined = parts.join(" · ");
  return joined.length > maxLength ? `${joined.slice(0, maxLength)}…` : joined;
}
