import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { employees, payslips } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import { computeLeakage } from "@/lib/payroll-calc"
import type { HonoVariables } from "@/server/types"
import { eq, and, inArray } from "drizzle-orm"
import { z } from "zod"

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  .get("/summary/:periodId", requireRole("admin", "hr"), async (c) => {
    const periodId = c.req.param("periodId")!
    const rows = await db.select().from(payslips).where(eq(payslips.periodId, periodId))

    const totalNetPay = rows.reduce((s, r) => s + parseFloat(r.netPay as string), 0)
    const totalDeductions = rows.reduce(
      (s, r) =>
        s +
        parseFloat(r.sss as string) +
        parseFloat(r.philhealth as string) +
        parseFloat(r.pagibig as string) +
        parseFloat(r.withholdingTax as string),
      0,
    )
    const byStatus = { pending: 0, approved: 0, paid: 0 }
    for (const r of rows) byStatus[r.status]++

    return c.json({
      periodId,
      totalPayslips: rows.length,
      totalNetPay: Math.round(totalNetPay * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      averageNetPay: rows.length ? Math.round((totalNetPay / rows.length) * 100) / 100 : 0,
      paymentStatus: byStatus,
    })
  })

  .get("/", async (c) => {
    const user = c.get("user")
    const { periodId, employeeId, status, limit = "50", offset = "0" } = c.req.query()

    if (user.role === "employee") {
      const emp = await db.query.employees.findFirst({
        where: eq(employees.userId, user.id),
      })
      if (!emp) return c.json([])

      const conditions: any[] = [eq(payslips.employeeId, emp.id)]
      if (status) conditions.push(eq(payslips.status, status as "pending" | "approved" | "paid"))
      if (periodId) conditions.push(eq(payslips.periodId, periodId))

      const rows = await db.query.payslips.findMany({
        where: and(...conditions),
        with: { period: true },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: parseInt(limit),
        offset: parseInt(offset),
      })
      // Employees may only see payslips from released payroll periods.
      return c.json(rows.filter((r) => r.period?.status === "released"))
    }

    const conditions: any[] = []
    if (periodId) conditions.push(eq(payslips.periodId, periodId))
    if (employeeId) conditions.push(eq(payslips.employeeId, employeeId))
    if (status) conditions.push(eq(payslips.status, status as "pending" | "approved" | "paid"))

    const rows = await db.query.payslips.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        employee: { with: { user: { columns: { name: true, email: true } } } },
        period: true,
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
    return c.json(rows)
  })

  .get("/:id", async (c) => {
    const user = c.get("user")
    const id = c.req.param("id")!

    const slip = await db.query.payslips.findFirst({
      where: eq(payslips.id, id),
      with: {
        employee: { with: { user: { columns: { name: true, email: true } } } },
        period: true,
      },
    })
    if (!slip) return c.json({ error: "Not found" }, 404)

    if (user.role === "employee") {
      const emp = await db.query.employees.findFirst({
        where: eq(employees.userId, user.id),
      })
      if (!emp || slip.employeeId !== emp.id) return c.json({ error: "Forbidden" }, 403)
      if (slip.period?.status !== "released") return c.json({ error: "Forbidden" }, 403)
    }

    return c.json(slip)
  })

  .patch(
    "/:id",
    requireRole("admin", "hr"),
    zValidator(
      "json",
      z
        .object({
          status: z.enum(["approved", "paid"]),
          // Amount actually released to the employee, reported by the
          // releasing staff. Required when marking a payslip "paid" so
          // leakage can be reconciled against the computed netPay.
          actualNetPay: z.number().positive().optional(),
        })
        .refine((v) => v.status !== "paid" || v.actualNetPay !== undefined, {
          message: "actualNetPay is required when marking a payslip as paid",
          path: ["actualNetPay"],
        }),
    ),
    async (c) => {
      const id = c.req.param("id")!
      const { status, actualNetPay } = c.req.valid("json")
      const [updated] = await db
        .update(payslips)
        .set(
          status === "paid"
            ? { status, actualNetPay: String(actualNetPay), paidAt: new Date() }
            : { status },
        )
        .where(eq(payslips.id, id))
        .returning()
      if (!updated) return c.json({ error: "Not found" }, 404)
      return c.json(updated)
    },
  )

  // Bulk-approve pending payslips in one call, e.g. "Approve Selected" on the
  // payroll period page. Only rows currently "pending" are touched, so
  // already-approved/paid payslips passed in by mistake are silently skipped.
  .patch(
    "/bulk-approve",
    requireRole("admin", "hr"),
    zValidator("json", z.object({ ids: z.array(z.string().uuid()).min(1) })),
    async (c) => {
      const { ids } = c.req.valid("json")
      const updated = await db
        .update(payslips)
        .set({ status: "approved" })
        .where(and(inArray(payslips.id, ids), eq(payslips.status, "pending")))
        .returning({ id: payslips.id })
      return c.json({ approved: updated.map((u) => u.id) })
    },
  )

  // Payroll leakage report: expected (netPay) vs. actual (actualNetPay)
  // released amount for every payslip in a period, with a computed status.
  .get("/leakage/:periodId", requireRole("admin", "hr"), async (c) => {
    const periodId = c.req.param("periodId")!
    const rows = await db.query.payslips.findMany({
      where: eq(payslips.periodId, periodId),
      with: {
        employee: { with: { user: { columns: { name: true, email: true } } } },
      },
    })

    const results = rows.map((r) => {
      const netPay = parseFloat(r.netPay as string)
      const actualNetPay = r.actualNetPay === null ? null : parseFloat(r.actualNetPay as string)
      const { leakage, status } = computeLeakage({ netPay, actualNetPay })
      return {
        payslipId: r.id,
        employeeId: r.employeeId,
        employeeNo: r.employee?.employeeNo,
        name: r.employee?.user?.name,
        netPay,
        actualNetPay,
        leakage,
        leakageStatus: status,
        paidAt: r.paidAt,
      }
    })

    const totalOverpayment = round2(
      results.filter((r) => r.leakageStatus === "overpayment").reduce((s, r) => s + (r.leakage ?? 0), 0),
    )
    const totalUnderpayment = round2(
      results.filter((r) => r.leakageStatus === "underpayment").reduce((s, r) => s + (r.leakage ?? 0), 0),
    )

    return c.json({ periodId, rows: results, totalOverpayment, totalUnderpayment })
  })

export { router as payslipsRouter }

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
