export function trackMembersEvent(
  event: string,
  payload: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[members-telemetry]", event, payload);
  }
}
