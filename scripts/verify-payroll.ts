/**
 * Verification harness — runs the SAME engine functions the payroll route uses
 * (aggregateAttendance + calculatePayrollFromAttendance) against the live
 * seeded data, and prints every line item for manual checking. Read-only.
 */
import { db } from "@/lib/db"
import { eq, and, gte, lte } from "drizzle-orm"
import {
  employees,
  schedules,
  holidays,
  timeLogs,
  leaveRequests,
  loans,
  payrollPeriods,
} from "@/lib/db/schema"
import { getPayrollSettings } from "@/server/routes/settings"
import {
  aggregateAttendance,
  calculatePayrollFromAttendance,
  isLeavePaid,
  type PayrollSettingsInput,
} from "@/lib/payroll-calc"

function toSettingsInput(s: any): PayrollSettingsInput {
  return {
    restDayRate: parseFloat(s.restDayRate),
    nightDiffRate: parseFloat(s.nightDiffRate),
    regularHolidayRate: parseFloat(s.regularHolidayRate),
    specialHolidayRate: parseFloat(s.specialHolidayRate),
    workingDaysPerMonth: s.workingDaysPerMonth,
    workHoursPerDay: parseFloat(s.workHoursPerDay),
    lateGracePeriodMinutes: s.lateGracePeriodMinutes,
    nightDiffStart: s.nightDiffStart,
    nightDiffEnd: s.nightDiffEnd,
    thirteenthMonthEveryCutoff: s.thirteenthMonthEveryCutoff,
    sssEnabled: s.sssEnabled,
    philhealthEnabled: s.philhealthEnabled,
    pagibigEnabled: s.pagibigEnabled,
    taxEnabled: s.taxEnabled,
    philhealthRate: parseFloat(s.philhealthRate),
    holidayAmount: parseFloat(s.holidayAmount),
    holidayActualRate: s.holidayActualRate,
    nightDiffAmount: parseFloat(s.nightDiffAmount),
    nightDiffActualRate: s.nightDiffActualRate,
    leaveAmount: parseFloat(s.leaveAmount),
    leaveActualRate: s.leaveActualRate,
    lateAmountPerMinute: parseFloat(s.lateAmountPerMinute),
    sundayHolidayPaid: s.sundayHolidayPaid,
  }
}

function eachDate(from: string, to: string): string[] {
  const out: string[] = []
  const d = new Date(from)
  const end = new Date(to)
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out
}

const peso = (n: number) => "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function main() {
  const settings = toSettingsInput(await getPayrollSettings())
  const period = await db.query.payrollPeriods.findFirst({
    where: eq(payrollPeriods.label, "June 2026 (1st Half)"),
  })
  if (!period) throw new Error("Seeded period not found")
  console.log(`\n=== Period: ${period.label} (${period.dateFrom} → ${period.dateTo}) ===`)
  console.log(
    `Rates: specHol×${settings.specialHolidayRate} regHol×${settings.regularHolidayRate} | ${settings.workingDaysPerMonth} days/mo, ${settings.workHoursPerDay} h/day\n`,
  )

  const allSchedules = await db.select().from(schedules)
  const scheduleMap = new Map(allSchedules.map((s) => [s.id, s]))

  const periodHolidays = await db
    .select()
    .from(holidays)
    .where(and(gte(holidays.date, period.dateFrom), lte(holidays.date, period.dateTo)))
  console.log("Holidays in period:", periodHolidays.map((h) => `${h.date}(${h.type})`).join(", ") || "none")

  const periodLogs = await db
    .select()
    .from(timeLogs)
    .where(and(gte(timeLogs.logDate, period.dateFrom), lte(timeLogs.logDate, period.dateTo)))
  const logsByEmp = new Map<string, typeof periodLogs>()
  for (const l of periodLogs) {
    const arr = logsByEmp.get(l.employeeId) ?? []
    arr.push(l)
    logsByEmp.set(l.employeeId, arr)
  }

  const periodLeaves = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.status, "approved"),
        lte(leaveRequests.dateFrom, period.dateTo),
        gte(leaveRequests.dateTo, period.dateFrom),
      ),
    )
  const leavesByEmp = new Map<string, { date: string; paid: boolean }[]>()
  for (const lr of periodLeaves) {
    const dates = eachDate(lr.dateFrom, lr.dateTo)
      .filter((d) => d >= period.dateFrom && d <= period.dateTo)
      .map((d) => ({ date: d, paid: isLeavePaid(lr.type) }))
    const arr = leavesByEmp.get(lr.employeeId) ?? []
    arr.push(...dates)
    leavesByEmp.set(lr.employeeId, arr)
  }

  const activeLoans = await db.select().from(loans).where(eq(loans.status, "active"))
  const loansByEmp = new Map<string, typeof activeLoans>()
  for (const ln of activeLoans) {
    const arr = loansByEmp.get(ln.employeeId) ?? []
    arr.push(ln)
    loansByEmp.set(ln.employeeId, arr)
  }

  const allEmployees = await db.query.employees.findMany({
    with: { user: { columns: { name: true } } },
  })

  for (const emp of allEmployees) {
    if (!emp.isActive) continue
    const sched = emp.scheduleId ? scheduleMap.get(emp.scheduleId) : null
    const empLogs = (logsByEmp.get(emp.id) ?? []).map((l) => ({
      logDate: l.logDate,
      amIn: l.amIn,
      amOut: l.amOut,
      pmIn: l.pmIn,
      pmOut: l.pmOut,
    }))

    const { aggregate } = aggregateAttendance({
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      schedule: sched
        ? {
            timeIn: sched.timeIn,
            timeOut: sched.timeOut,
            breakMinutes: sched.breakMinutes,
            workDays: sched.workDays,
            isNightShift: sched.isNightShift,
          }
        : null,
      holidays: periodHolidays.map((h) => ({ date: h.date, type: h.type })),
      logs: empLogs,
      leaves: leavesByEmp.get(emp.id) ?? [],
      settings,
    })

    const empLoans = loansByEmp.get(emp.id) ?? []
    let loanDeduction = 0
    for (const ln of empLoans) {
      loanDeduction += Math.min(parseFloat(ln.amortization), parseFloat(ln.balance))
    }

    const calc = calculatePayrollFromAttendance({
      basicSalary: parseFloat(emp.basicSalary),
      allowance: parseFloat(emp.allowance ?? "0"),
      settings,
      attendance: aggregate,
      deductToggles: {
        sss: emp.deductSss,
        philhealth: emp.deductPhilhealth,
        pagibig: emp.deductPagibig,
        tax: emp.deductTax,
      },
      latePerMinuteOverride: emp.latePerMinuteOverride
        ? parseFloat(emp.latePerMinuteOverride)
        : null,
      loanDeduction,
    })

    const dailyRate = parseFloat(emp.basicSalary) / settings.workingDaysPerMonth
    console.log(`\n────────────────────────────────────────────────────────`)
    console.log(`${emp.user?.name} (${emp.employeeNo}) — ${sched?.name ?? "Open"} — basic ${peso(parseFloat(emp.basicSalary))}/mo (daily ${peso(dailyRate)})`)
    console.log("  Attendance buckets:", JSON.stringify(aggregate))
    console.log("  Earnings:")
    console.log(`    Basic pay (${aggregate.regularDaysWorked} days + ${aggregate.paidLeaveDays} paid leave) = ${peso(calc.basicPay)}`)
    console.log(`    Allowance                = ${peso(calc.allowances)}`)
    console.log(`    Night diff (${aggregate.nightDiffHours}h)      = ${peso(calc.nightDiffPay)}`)
    console.log(`    Rest day (${aggregate.restDayHours}h)        = ${peso(calc.restDayPay)}`)
    console.log(`    Holiday (reg ${aggregate.regularHolidayHours}h/spec ${aggregate.specialHolidayHours}h) = ${peso(calc.holidayPay)}`)
    console.log(`    Late deduction (${aggregate.lateMinutes}m) = -${peso(calc.lateDeduction)}`)
    console.log(`    GROSS                    = ${peso(calc.grossPay)}`)
    console.log("  Deductions:")
    console.log(`    SSS=${peso(calc.sss)} PhilHealth=${peso(calc.philhealth)} Pag-IBIG=${peso(calc.pagibig)} Tax=${peso(calc.withholdingTax)} Loan=${peso(calc.loanDeduction)}`)
    console.log(`  NET PAY                    = ${peso(calc.netPay)}`)
  }

  // Scenario: approve EMP-001's pending Jun-15 vacation and show the delta.
  const emp1 = allEmployees.find((e) => e.employeeNo === "EMP-001")
  if (emp1) {
    const sched = emp1.scheduleId ? scheduleMap.get(emp1.scheduleId) : null
    const empLogs = (logsByEmp.get(emp1.id) ?? []).map((l) => ({
      logDate: l.logDate, amIn: l.amIn, amOut: l.amOut, pmIn: l.pmIn, pmOut: l.pmOut,
    }))
    const withLeave = aggregateAttendance({
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      schedule: sched ? { timeIn: sched.timeIn, timeOut: sched.timeOut, breakMinutes: sched.breakMinutes, workDays: sched.workDays, isNightShift: sched.isNightShift } : null,
      holidays: periodHolidays.map((h) => ({ date: h.date, type: h.type })),
      logs: empLogs,
      leaves: [{ date: "2026-06-15", paid: true }],
      settings,
    })
    const calc = calculatePayrollFromAttendance({
      basicSalary: parseFloat(emp1.basicSalary),
      allowance: parseFloat(emp1.allowance ?? "0"),
      settings,
      attendance: withLeave.aggregate,
      loanDeduction: 1000,
    })
    console.log(`\n=== Scenario: EMP-001 with Jun-15 vacation APPROVED ===`)
    console.log(`  paidLeaveDays=${withLeave.aggregate.paidLeaveDays}, basicPay=${peso(calc.basicPay)}, NET=${peso(calc.netPay)}`)
  }

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
