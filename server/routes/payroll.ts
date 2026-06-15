import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import {
  employees,
  payrollPeriods,
  payslips,
  timeLogs,
  holidays,
  schedules,
  leaveRequests,
  loans,
} from "@/lib/db/schema"
import { insertPayrollPeriodSchema } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import { getPayrollSettings } from "@/server/routes/settings"
import {
  aggregateAttendance,
  calculatePayrollFromAttendance,
  isLeavePaid,
  type PayrollSettingsInput,
  type ScheduleInput,
} from "@/lib/payroll-calc"
import type { HonoVariables } from "@/server/types"
import { eq, and, gte, lte } from "drizzle-orm"
import { z } from "zod"

// Expands an inclusive [from, to] date range into "YYYY-MM-DD" keys.
function eachDate(from: string, to: string): string[] {
  const out: string[] = []
  const [fy, fm, fd] = from.split("-").map(Number)
  const [ty, tm, td] = to.split("-").map(Number)
  const cur = new Date(fy, fm - 1, fd)
  const end = new Date(ty, tm - 1, td)
  while (cur <= end) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, "0")
    const d = String(cur.getDate()).padStart(2, "0")
    out.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

type SettingsRow = Awaited<ReturnType<typeof getPayrollSettings>>
type ScheduleRow = typeof schedules.$inferSelect

// Maps the DB settings row (numeric columns are strings) to engine input.
function toSettingsInput(s: SettingsRow): PayrollSettingsInput {
  return {
    otRate: parseFloat(s.otRate),
    restDayRate: parseFloat(s.restDayRate),
    restDayOtRate: parseFloat(s.restDayOtRate),
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
    overtimeAmount: parseFloat(s.overtimeAmount),
    overtimeActualRate: s.overtimeActualRate,
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

function toScheduleInput(s: ScheduleRow | null | undefined): ScheduleInput | null {
  if (!s) return null
  return {
    timeIn: s.timeIn,
    timeOut: s.timeOut,
    breakMinutes: s.breakMinutes,
    workDays: s.workDays,
    isNightShift: s.isNightShift,
  }
}

// Map a raw time-log row to the six-punch shape the attendance engine expects.
function toLogInput(l: {
  logDate: string
  amIn: Date | null
  amOut: Date | null
  pmIn: Date | null
  pmOut: Date | null
  otIn: Date | null
  otOut: Date | null
}) {
  return {
    logDate: l.logDate,
    amIn: l.amIn,
    amOut: l.amOut,
    pmIn: l.pmIn,
    pmOut: l.pmOut,
    otIn: l.otIn,
    otOut: l.otOut,
  }
}

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  .get("/", async (c) => {
    const { status, limit = "50", offset = "0" } = c.req.query()
    const rows = await db.query.payrollPeriods.findMany({
      where: status ? eq(payrollPeriods.status, status as "draft" | "processed" | "released") : undefined,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
    return c.json(rows)
  })

  // 13th-month report: 1/12 of basic salary earned in the calendar year,
  // pro-rated by months of service. Computed on the fly (no extra tables).
  .get("/thirteenth-month", requireRole("admin", "hr"), async (c) => {
    const year = parseInt(c.req.query("year") ?? "") || new Date().getFullYear()
    const { designation, group, team } = c.req.query()

    const emps = await db.query.employees.findMany({
      where: eq(employees.isActive, true),
      with: { user: { columns: { name: true } } },
    })

    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)
    const now = new Date()
    const periodEnd = now < yearEnd ? now : yearEnd

    const rows = emps
      .filter((e) => (designation ? e.position === designation : true))
      .filter((e) => (group ? e.groupName === group : true))
      .filter((e) => (team ? e.department === team : true))
      .map((e) => {
        const hired = new Date(e.hiredAt)
        const start = hired > yearStart ? hired : yearStart
        // Inclusive month span between start and the period end.
        let months =
          (periodEnd.getFullYear() - start.getFullYear()) * 12 +
          (periodEnd.getMonth() - start.getMonth()) +
          1
        months = Math.max(0, Math.min(12, months))
        const basicSalary = parseFloat(e.basicSalary)
        const amount = Math.round(((basicSalary * months) / 12) * 100) / 100
        return {
          employeeId: e.id,
          employeeNo: e.employeeNo,
          name: e.user?.name ?? e.employeeNo,
          department: e.department,
          position: e.position,
          groupName: e.groupName,
          basicSalary,
          monthsWorked: months,
          amount,
        }
      })

    const total = Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100
    return c.json({ year, rows, total })
  })

  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const period = await db.query.payrollPeriods.findFirst({
      where: eq(payrollPeriods.id, id),
    })
    if (!period) return c.json({ error: "Not found" }, 404)
    return c.json(period)
  })

  // Aggregated daily attendance for one employee in a period (time card view).
  .get("/:id/timecard/:employeeId", async (c) => {
    const user = c.get("user")
    const periodId = c.req.param("id")!
    const employeeId = c.req.param("employeeId")!

    const period = await db.query.payrollPeriods.findFirst({
      where: eq(payrollPeriods.id, periodId),
    })
    if (!period) return c.json({ error: "Period not found" }, 404)

    const emp = await db.query.employees.findFirst({
      where: eq(employees.id, employeeId),
      with: { user: { columns: { name: true } } },
    })
    if (!emp) return c.json({ error: "Employee not found" }, 404)
    if (user.role === "employee" && emp.userId !== user.id) {
      return c.json({ error: "Forbidden" }, 403)
    }

    const settings = toSettingsInput(await getPayrollSettings())
    const sched = emp.scheduleId
      ? await db.query.schedules.findFirst({ where: eq(schedules.id, emp.scheduleId) })
      : null
    const periodHolidays = await db
      .select()
      .from(holidays)
      .where(and(gte(holidays.date, period.dateFrom), lte(holidays.date, period.dateTo)))
    const logs = await db
      .select()
      .from(timeLogs)
      .where(
        and(
          eq(timeLogs.employeeId, employeeId),
          gte(timeLogs.logDate, period.dateFrom),
          lte(timeLogs.logDate, period.dateTo),
        ),
      )
    const empLeaves = await db
      .select()
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.employeeId, employeeId),
          eq(leaveRequests.status, "approved"),
          lte(leaveRequests.dateFrom, period.dateTo),
          gte(leaveRequests.dateTo, period.dateFrom),
        ),
      )

    const { aggregate, days } = aggregateAttendance({
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      schedule: toScheduleInput(sched),
      holidays: periodHolidays.map((h) => ({ date: h.date, type: h.type })),
      logs: logs.map(toLogInput),
      leaves: empLeaves.flatMap((lr) =>
        eachDate(lr.dateFrom, lr.dateTo)
          .filter((d) => d >= period.dateFrom && d <= period.dateTo)
          .map((d) => ({ date: d, paid: isLeavePaid(lr.type) })),
      ),
      settings,
    })

    return c.json({
      employee: { id: emp.id, employeeNo: emp.employeeNo, name: emp.user?.name },
      period: { id: period.id, label: period.label, dateFrom: period.dateFrom, dateTo: period.dateTo },
      aggregate,
      days,
    })
  })

  .post(
    "/",
    requireRole("admin", "hr"),
    zValidator("json", insertPayrollPeriodSchema),
    async (c) => {
      const user = c.get("user")
      const data = c.req.valid("json")
      const [created] = await db
        .insert(payrollPeriods)
        .values({ ...data, createdBy: user.id })
        .returning()
      return c.json(created, 201)
    },
  )

  .patch(
    "/:id",
    requireRole("admin", "hr"),
    zValidator("json", z.object({ status: z.enum(["processed", "released"]) })),
    async (c) => {
      const id = c.req.param("id")!
      const { status } = c.req.valid("json")

      const period = await db.query.payrollPeriods.findFirst({
        where: eq(payrollPeriods.id, id),
      })
      if (!period) return c.json({ error: "Not found" }, 404)

      if (status === "processed" && period.status === "draft") {
        const settings = toSettingsInput(await getPayrollSettings())
        const allEmployees = await db.query.employees.findMany()
        const allSchedules = await db.select().from(schedules)
        const scheduleMap = new Map(allSchedules.map((s) => [s.id, s]))

        const periodHolidays = await db
          .select()
          .from(holidays)
          .where(
            and(gte(holidays.date, period.dateFrom), lte(holidays.date, period.dateTo)),
          )
        const holidayInput = periodHolidays.map((h) => ({ date: h.date, type: h.type }))

        const periodLogs = await db
          .select()
          .from(timeLogs)
          .where(
            and(
              gte(timeLogs.logDate, period.dateFrom),
              lte(timeLogs.logDate, period.dateTo),
            ),
          )
        const logsByEmp = new Map<string, typeof periodLogs>()
        for (const l of periodLogs) {
          const arr = logsByEmp.get(l.employeeId) ?? []
          arr.push(l)
          logsByEmp.set(l.employeeId, arr)
        }

        // Approved leaves overlapping the period, expanded to dated entries.
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

        // Active loans drive a per-cutoff amortization deduction.
        const activeLoans = await db
          .select()
          .from(loans)
          .where(eq(loans.status, "active"))
        const loansByEmp = new Map<string, typeof activeLoans>()
        for (const ln of activeLoans) {
          const arr = loansByEmp.get(ln.employeeId) ?? []
          arr.push(ln)
          loansByEmp.set(ln.employeeId, arr)
        }

        for (const emp of allEmployees) {
          if (!emp.isActive) continue // inactive employees are excluded from payroll

          const sched = emp.scheduleId ? scheduleMap.get(emp.scheduleId) : null
          const empLogs = (logsByEmp.get(emp.id) ?? []).map(toLogInput)

          const { aggregate } = aggregateAttendance({
            dateFrom: period.dateFrom,
            dateTo: period.dateTo,
            schedule: toScheduleInput(sched),
            holidays: holidayInput,
            logs: empLogs,
            leaves: leavesByEmp.get(emp.id) ?? [],
            settings,
          })

          // Sum amortization across the employee's active loans, each capped at
          // its outstanding balance; remember the resulting balances to persist.
          const empLoans = loansByEmp.get(emp.id) ?? []
          let totalLoanDeduction = 0
          const loanUpdates: { id: string; newBalance: number }[] = []
          for (const ln of empLoans) {
            const bal = parseFloat(ln.balance)
            const amort = parseFloat(ln.amortization)
            const deducted = Math.min(amort, bal)
            if (deducted <= 0) continue
            totalLoanDeduction += deducted
            loanUpdates.push({
              id: ln.id,
              newBalance: Math.round((bal - deducted) * 100) / 100,
            })
          }

          const calc = calculatePayrollFromAttendance({
            basicSalary: parseFloat(emp.basicSalary as string),
            allowance: parseFloat((emp.allowance as string) ?? "0"),
            settings,
            attendance: aggregate,
            deductToggles: {
              sss: emp.deductSss,
              philhealth: emp.deductPhilhealth,
              pagibig: emp.deductPagibig,
              tax: emp.deductTax,
            },
            latePerMinuteOverride: emp.latePerMinuteOverride
              ? parseFloat(emp.latePerMinuteOverride as string)
              : null,
            loanDeduction: totalLoanDeduction,
          })

          const inserted = await db
            .insert(payslips)
            .values({
              employeeId: emp.id,
              periodId: id,
              basicPay: String(calc.basicPay),
              allowances: String(calc.allowances),
              otPay: String(calc.otPay),
              nightDiffPay: String(calc.nightDiffPay),
              restDayPay: String(calc.restDayPay),
              holidayPay: String(calc.holidayPay),
              grossPay: String(calc.grossPay),
              lateDeduction: String(calc.lateDeduction),
              sss: String(calc.sss),
              philhealth: String(calc.philhealth),
              pagibig: String(calc.pagibig),
              withholdingTax: String(calc.withholdingTax),
              loanDeduction: String(calc.loanDeduction),
              thirteenthMonthPay: String(calc.thirteenthMonthPay),
              daysWorked: String(calc.daysWorked),
              lateMinutes: calc.lateMinutes,
              otHours: String(calc.otHours),
              netPay: String(calc.netPay),
              status: "pending",
            })
            .onConflictDoNothing()
            .returning({ id: payslips.id })

          // Only decrement loan balances when a fresh payslip was created, so
          // re-processing a period never double-charges amortization.
          if (inserted.length) {
            for (const u of loanUpdates) {
              await db
                .update(loans)
                .set({
                  balance: String(u.newBalance),
                  status: u.newBalance <= 0 ? "paid" : "active",
                })
                .where(eq(loans.id, u.id))
            }
          }
        }
      }

      const [updated] = await db
        .update(payrollPeriods)
        .set({ status })
        .where(eq(payrollPeriods.id, id))
        .returning()

      return c.json(updated)
    },
  )

  .delete("/:id", requireRole("admin"), async (c) => {
    const id = c.req.param("id")!
    const period = await db.query.payrollPeriods.findFirst({
      where: eq(payrollPeriods.id, id),
    })
    if (!period) return c.json({ error: "Not found" }, 404)
    if (period.status !== "draft") {
      return c.json({ error: "Can only delete draft periods" }, 400)
    }
    await db.delete(payrollPeriods).where(eq(payrollPeriods.id, id))
    return c.json({ success: true })
  })

export { router as payrollRouter }
