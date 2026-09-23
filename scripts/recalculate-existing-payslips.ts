/**
 * Recalculates unpaid payslips from the same attendance and DTR data used for
 * new payroll processing. Paid payslips are deliberately left untouched: their
 * net pay is already reconciled to an amount released to an employee.
 */
import { db } from "@/lib/db"
import {
  absences,
  employees,
  leaveRequests,
  payslips,
  timeLogs,
} from "@/lib/db/schema"
import { getPayrollSettings } from "@/server/routes/settings"
import {
  aggregateAbsences,
  aggregateLateMinutes,
  calculatePayrollFromAbsences,
  cutoffOf,
  isLeavePaid,
  type PayrollSettingsInput,
} from "@/lib/payroll-calc"
import { and, eq, gte, lte, ne } from "drizzle-orm"

function toSettingsInput(s: Awaited<ReturnType<typeof getPayrollSettings>>): PayrollSettingsInput {
  return {
    workingDaysPerMonth: s.workingDaysPerMonth,
    workDays: s.workDays,
    thirteenthMonthEveryCutoff: s.thirteenthMonthEveryCutoff,
    sssEnabled: s.sssEnabled,
    philhealthEnabled: s.philhealthEnabled,
    pagibigEnabled: s.pagibigEnabled,
    taxEnabled: s.taxEnabled,
    philhealthRate: parseFloat(s.philhealthRate),
    leaveAmount: parseFloat(s.leaveAmount),
    leaveActualRate: s.leaveActualRate,
    standardTimeIn: s.standardTimeIn,
    standardTimeOut: s.standardTimeOut,
    lateGracePeriodMinutes: s.lateGracePeriodMinutes,
    lateDeductionEnabled: s.lateDeductionEnabled,
    dailyRateBasis: s.dailyRateBasis,
    contributionMode: s.contributionMode,
    sssAmount: parseFloat(s.sssAmount),
    philhealthAmount: parseFloat(s.philhealthAmount),
    pagibigAmount: parseFloat(s.pagibigAmount),
    sssCutoff: s.sssCutoff,
    philhealthCutoff: s.philhealthCutoff,
    pagibigCutoff: s.pagibigCutoff,
  }
}

function eachDate(from: string, to: string): string[] {
  const dates: string[] = []
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number)
  const [toYear, toMonth, toDay] = to.split("-").map(Number)
  const cursor = new Date(fromYear, fromMonth - 1, fromDay)
  const end = new Date(toYear, toMonth - 1, toDay)
  while (cursor <= end) {
    dates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

async function main() {
  const settings = toSettingsInput(await getPayrollSettings())
  const existingSlips = await db.query.payslips.findMany({
    where: ne(payslips.status, "paid"),
    with: { period: true },
  })

  let updatedCount = 0
  for (const slip of existingSlips) {
    const period = slip.period
    if (!period) continue
    const employee = await db.query.employees.findFirst({ where: eq(employees.id, slip.employeeId) })
    if (!employee) continue

    const [employeeAbsences, employeeLeaves, employeeTimeLogs] = await Promise.all([
      db.select().from(absences).where(and(eq(absences.employeeId, employee.id), gte(absences.date, period.dateFrom), lte(absences.date, period.dateTo))),
      db.select().from(leaveRequests).where(and(eq(leaveRequests.employeeId, employee.id), eq(leaveRequests.status, "approved"), lte(leaveRequests.dateFrom, period.dateTo), gte(leaveRequests.dateTo, period.dateFrom))),
      db.select().from(timeLogs).where(and(eq(timeLogs.employeeId, employee.id), gte(timeLogs.date, period.dateFrom), lte(timeLogs.date, period.dateTo))),
    ])

    const { aggregate } = aggregateAbsences({
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      workDays: settings.workDays,
      absenceDates: employeeAbsences.map((absence) => absence.date),
      leaves: employeeLeaves.flatMap((leave) => eachDate(leave.dateFrom, leave.dateTo)
        .filter((date) => date >= period.dateFrom && date <= period.dateTo)
        .map((date) => ({ date, paid: isLeavePaid(leave.type) }))),
    })
    const lateMinutes = aggregateLateMinutes({
      timeLogs: employeeTimeLogs,
      standardTimeIn: settings.standardTimeIn,
      gracePeriodMinutes: settings.lateGracePeriodMinutes,
    })
    const calc = calculatePayrollFromAbsences({
      basicSalary: parseFloat(employee.basicSalary),
      allowance: parseFloat(employee.allowance ?? "0"),
      settings,
      absence: aggregate,
      cutoff: cutoffOf(period.dateTo),
      lateMinutes,
      deductToggles: {
        sss: employee.deductSss,
        philhealth: employee.deductPhilhealth,
        pagibig: employee.deductPagibig,
        tax: employee.deductTax,
      },
      // Do not derive historical loan amortization from today's balance.
      loanDeduction: parseFloat(slip.loanDeduction),
    })

    await db.update(payslips).set({
      basicPay: String(calc.basicPay),
      allowances: String(calc.allowances),
      grossPay: String(calc.grossPay),
      sss: String(calc.sss),
      philhealth: String(calc.philhealth),
      pagibig: String(calc.pagibig),
      withholdingTax: String(calc.withholdingTax),
      thirteenthMonthPay: String(calc.thirteenthMonthPay),
      daysWorked: String(calc.daysWorked),
      lateMinutes: calc.lateMinutes,
      lateDeduction: String(calc.lateDeduction),
      netPay: String(calc.netPay),
    }).where(eq(payslips.id, slip.id))
    updatedCount += 1
  }

  console.log(`Recalculated ${updatedCount} unpaid payslip(s). Paid payslips were not changed.`)
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error)
  process.exit(1)
})
