/**
 * Verification harness — runs the SAME engine functions the payroll route uses
 * (aggregateAbsences + calculatePayrollFromAbsences) against the live seeded
 * data, and prints every line item for manual checking. Read-only.
 */
import { db } from "@/lib/db"
import { eq, and, gte, lte } from "drizzle-orm"
import { absences, leaveRequests, loans, payrollPeriods } from "@/lib/db/schema"
import { getPayrollSettings } from "@/server/routes/settings"
import {
  aggregateAbsences,
  calculatePayrollFromAbsences,
  isLeavePaid,
  type PayrollSettingsInput,
} from "@/lib/payroll-calc"

function toSettingsInput(s: any): PayrollSettingsInput {
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
    `School week: ${settings.workDays.join(", ")} | ${settings.workingDaysPerMonth} working days/mo\n`,
  )

  const periodAbsences = await db
    .select()
    .from(absences)
    .where(and(gte(absences.date, period.dateFrom), lte(absences.date, period.dateTo)))
  console.log(
    "Absences in period:",
    periodAbsences.map((a) => `${a.date} (employee ${a.employeeId.slice(0, 8)})`).join(", ") || "none",
  )

  const absencesByEmp = new Map<string, string[]>()
  for (const a of periodAbsences) {
    const arr = absencesByEmp.get(a.employeeId) ?? []
    arr.push(a.date)
    absencesByEmp.set(a.employeeId, arr)
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

    const { aggregate } = aggregateAbsences({
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      workDays: settings.workDays,
      absenceDates: absencesByEmp.get(emp.id) ?? [],
      leaves: leavesByEmp.get(emp.id) ?? [],
    })

    const empLoans = loansByEmp.get(emp.id) ?? []
    let loanDeduction = 0
    for (const ln of empLoans) {
      loanDeduction += Math.min(parseFloat(ln.amortization), parseFloat(ln.balance))
    }

    const calc = calculatePayrollFromAbsences({
      basicSalary: parseFloat(emp.basicSalary),
      allowance: parseFloat(emp.allowance ?? "0"),
      settings,
      absence: aggregate,
      deductToggles: {
        sss: emp.deductSss,
        philhealth: emp.deductPhilhealth,
        pagibig: emp.deductPagibig,
        tax: emp.deductTax,
      },
      loanDeduction,
    })

    const dailyRate = parseFloat(emp.basicSalary) / settings.workingDaysPerMonth
    console.log(`\n────────────────────────────────────────────────────────`)
    console.log(`${emp.user?.name} (${emp.employeeNo}) — basic ${peso(parseFloat(emp.basicSalary))}/mo (daily ${peso(dailyRate)})`)
    console.log("  Attendance buckets:", JSON.stringify(aggregate))
    console.log("  Earnings:")
    console.log(`    Basic pay (${aggregate.daysPresent} present + ${aggregate.paidLeaveDays} paid leave) = ${peso(calc.basicPay)}`)
    console.log(`    Allowance                = ${peso(calc.allowances)}`)
    console.log(`    GROSS                    = ${peso(calc.grossPay)}`)
    console.log("  Deductions:")
    console.log(`    SSS=${peso(calc.sss)} PhilHealth=${peso(calc.philhealth)} Pag-IBIG=${peso(calc.pagibig)} Tax=${peso(calc.withholdingTax)} Loan=${peso(calc.loanDeduction)}`)
    console.log(`  NET PAY                    = ${peso(calc.netPay)}`)
  }

  // Scenario: approve EMP-001's pending Jun-15 vacation and show the delta.
  const emp1 = allEmployees.find((e) => e.employeeNo === "EMP-001")
  if (emp1) {
    const withLeave = aggregateAbsences({
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      workDays: settings.workDays,
      absenceDates: absencesByEmp.get(emp1.id) ?? [],
      leaves: [{ date: "2026-06-15", paid: true }],
    })
    const calc = calculatePayrollFromAbsences({
      basicSalary: parseFloat(emp1.basicSalary),
      allowance: parseFloat(emp1.allowance ?? "0"),
      settings,
      absence: withLeave.aggregate,
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
