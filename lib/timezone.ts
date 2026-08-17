// The org operates on Asia/Manila wall-clock time (UTC+8, no DST) for
// attendance and payroll. There is no per-org configurable timezone yet, so
// this is a fixed constant rather than an env var/setting.
export const ORG_TIMEZONE_OFFSET_MINUTES = 8 * 60

// Parses a naive "YYYY-MM-DDTHH:mm" datetime-local string (no timezone
// offset) as Asia/Manila wall-clock time, returning the correct UTC instant
// regardless of the server process's ambient timezone.
export function parseOrgLocalDateTime(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!match) return new Date(value)
  const [, y, mo, d, h, mi, s] = match
  const utcMs = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    s ? Number(s) : 0,
  )
  return new Date(utcMs - ORG_TIMEZONE_OFFSET_MINUTES * 60_000)
}

// Extracts the Asia/Manila wall-clock hour/minute for a stored instant,
// independent of the server process's ambient timezone.
export function getOrgLocalHoursMinutes(date: Date): { hours: number; minutes: number } {
  const shifted = new Date(date.getTime() + ORG_TIMEZONE_OFFSET_MINUTES * 60_000)
  return { hours: shifted.getUTCHours(), minutes: shifted.getUTCMinutes() }
}

// Returns today's date as "YYYY-MM-DD" in Asia/Manila wall-clock time,
// independent of the server process's ambient timezone.
export function getOrgLocalDateKey(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + ORG_TIMEZONE_OFFSET_MINUTES * 60_000)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0")
  const day = String(shifted.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
