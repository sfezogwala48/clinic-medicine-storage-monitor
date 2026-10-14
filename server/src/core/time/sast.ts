/** Clinic local zone: South African Standard Time (UTC+2, no DST). */
export const SAST_OFFSET = "+02:00";

/** South African Standard Time is UTC+2 year-round (no DST). */
export const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

/**
 * Current clinic-local time as ISO-8601 with the +02:00 offset, e.g.
 * 2026-10-14T02:30:15.123+02:00 — the same wall-clock convention devices use
 * for `recordedAt`, so server-stamped times (receivedAt, lastSeen, …) line up
 * with device timestamps instead of sitting two hours behind in UTC.
 */
export function nowSast(): string {
  return new Date(Date.now() + SAST_OFFSET_MS).toISOString().replace("Z", SAST_OFFSET);
}

/** Legacy TypeORM sqlite datetime format: UTC wall clock, no zone. */
const LEGACY_UTC = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/;

/**
 * Normalize any date-ish value to SAST ISO-8601 (`...+02:00`). Idempotent;
 * unparseable input is returned unchanged. Legacy zone-less sqlite values are
 * read as UTC (that is how TypeORM used to store them).
 */
export function toSast(value: string | Date): string {
  const date =
    typeof value === "string"
      ? new Date(LEGACY_UTC.test(value) ? `${value.replace(" ", "T")}Z` : value)
      : value;
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Date(date.getTime() + SAST_OFFSET_MS).toISOString().replace("Z", SAST_OFFSET);
}

/**
 * Column transformer so every datetime is stored and returned as SAST text.
 * Use with `type: "varchar"`: the sqlite driver would otherwise rewrite
 * `datetime` values to UTC wall clock on write.
 */
export const sastDateTime = {
  to: (value: string | Date | null | undefined) => (value == null ? value : toSast(value)),
  from: (value: string | null | undefined) => (value == null ? value : toSast(value)),
};
