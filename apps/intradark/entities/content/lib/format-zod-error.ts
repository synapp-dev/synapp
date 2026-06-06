/** First field-level Zod message for server action responses. */
export function formatZodActionError(err: {
  flatten: () => { fieldErrors: Record<string, string[]> };
}): string {
  const flat = err.flatten();
  const first = Object.values(flat.fieldErrors).find((a) => a?.length)?.[0];
  return first ?? "Invalid input.";
}
