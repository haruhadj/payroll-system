/**
 * One-time correction for time_log rows written before the Asia/Manila
 * timezone fix (see lib/timezone.ts). Under the old bug, a naive
 * "YYYY-MM-DDTHH:mm" string typed by HR was misinterpreted using the
 * server's ambient timezone instead of Asia/Manila, so the stored UTC
 * instant's hour/minute digits equal the *intended local* hour/minute
 * (just wrongly tagged as UTC). Subtracting 8h re-tags them correctly.
 *
 * Because some rows may have already been touched by the buggy edit
 * dialog more than once ("correction death spiral"), a blind -8h shift
 * is only trustworthy when it lands in a plausible workday window. Rows
 * where it doesn't are left untouched and flagged for manual re-entry
 * via the (now-fixed) UI.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/fix-timelog-timezone.ts            # dry run (default)
 *   npx tsx --env-file=.env scripts/fix-timelog-timezone.ts --apply    # write corrections
 */
import { db } from "@/lib/db"
import { timeLogs, employees, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const APPLY = process.argv.includes("--apply")

const TIME_IN_MIN_HOUR = 4
const TIME_IN_MAX_HOUR = 12 // exclusive
const TIME_OUT_MIN_HOUR = 12
const TIME_OUT_MAX_HOUR = 24 // exclusive

function shiftBack8h(d: Date): Date {
  return new Date(d.getTime() - 8 * 60 * 60_000)
}

function manilaHour(d: Date): number {
  // The stored (buggy) UTC hour digits equal what was actually typed as
  // local time, so they double as the pre-shift Manila-local hour.
  return d.getUTCHours()
}

function fmt(d: Date | null): string {
  return d ? d.toISOString() : "(null)"
}

async function main() {
  const rows = await db.query.timeLogs.findMany({
    where: eq(timeLogs.source, "manual"),
    with: {
      employee: {
        columns: { id: true, employeeNo: true },
        with: { user: { columns: { name: true } } },
      },
    },
  })

  const autoFixable: { row: (typeof rows)[number]; newTimeIn: Date | null; newTimeOut: Date | null }[] = []
  const needsManualReview: (typeof rows)[number][] = []

  for (const row of rows) {
    const timeInHourOk = row.timeIn ? manilaHour(row.timeIn) >= TIME_IN_MIN_HOUR && manilaHour(row.timeIn) < TIME_IN_MAX_HOUR : true
    const timeOutHourOk = row.timeOut ? manilaHour(row.timeOut) >= TIME_OUT_MIN_HOUR && manilaHour(row.timeOut) < TIME_OUT_MAX_HOUR : true

    const newTimeIn = row.timeIn ? shiftBack8h(row.timeIn) : null
    const newTimeOut = row.timeOut ? shiftBack8h(row.timeOut) : null
    const orderOk = !newTimeIn || !newTimeOut || newTimeOut > newTimeIn

    if (timeInHourOk && timeOutHourOk && orderOk) {
      autoFixable.push({ row, newTimeIn, newTimeOut })
    } else {
      needsManualReview.push(row)
    }
  }

  console.log(`\nFound ${rows.length} manual time_log rows.\n`)

  console.log(`=== Auto-fixable (plausible -8h shift): ${autoFixable.length} ===`)
  for (const { row, newTimeIn, newTimeOut } of autoFixable) {
    const name = row.employee?.user?.name ?? row.employee?.employeeNo ?? row.employeeId
    console.log(
      `[${row.date}] ${name}\n  timeIn:  ${fmt(row.timeIn)} -> ${fmt(newTimeIn)}\n  timeOut: ${fmt(row.timeOut)} -> ${fmt(newTimeOut)}`,
    )
  }

  console.log(`\n=== Needs manual re-entry (shift not plausible): ${needsManualReview.length} ===`)
  for (const row of needsManualReview) {
    const name = row.employee?.user?.name ?? row.employee?.employeeNo ?? row.employeeId
    console.log(`[${row.date}] ${name}  timeIn: ${fmt(row.timeIn)}  timeOut: ${fmt(row.timeOut)}`)
  }

  if (!APPLY) {
    console.log(`\nDry run only. Re-run with --apply to write the ${autoFixable.length} auto-fixable correction(s).`)
    process.exit(0)
  }

  for (const { row, newTimeIn, newTimeOut } of autoFixable) {
    await db.update(timeLogs).set({ timeIn: newTimeIn, timeOut: newTimeOut }).where(eq(timeLogs.id, row.id))
  }
  console.log(`\nApplied ${autoFixable.length} correction(s). ${needsManualReview.length} row(s) still need manual re-entry.`)
  process.exit(0)
}

main()
