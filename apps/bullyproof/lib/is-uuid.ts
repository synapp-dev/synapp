const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `value` matches standard UUID string format. */
export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
