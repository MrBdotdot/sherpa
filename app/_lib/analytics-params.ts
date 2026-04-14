const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true if the string is a valid YYYY-MM-DD date. */
export function isValidDate(s: string): boolean {
  return ISO_DATE_RE.test(s);
}

/** Returns true if the string is a valid UUID. */
export function isValidUUID(s: string): boolean {
  return UUID_RE.test(s);
}
