import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { employees, payrollPeriods, payslips } from "@/lib/db/schema"
import { insertPayrollPeriodSchema } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import { calculatePayroll } from "@/lib/payroll-calc"
import type { HonoVariables } from "@/server/types"
import { eq } from "drizzle-orm"
import { z } from "zod"

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

  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const period = await db.query.payrollPeriods.findFirst({
      where: eq(payrollPeriods.id, id),
    })
    if (!period) return c.json({ error: "Not found" }, 404)
    return c.json(period)
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
        const allEmployees = await db.select().from(employees)
        for (const emp of allEmployees) {
          const calc = calculatePayroll({
            basicSalary: parseFloat(emp.basicSalary as string),
            allowances: parseFloat((emp.allowance as string) ?? "0"),
          })
          await db
            .insert(payslips)
            .values({
              employeeId: emp.id,
              periodId: id,
              basicPay: String(calc.basicPay),
              allowances: String(calc.allowances),
              grossPay: String(calc.grossPay),
              sss: String(calc.sss),
              philhealth: String(calc.philhealth),
              pagibig: String(calc.pagibig),
              withholdingTax: String(calc.withholdingTax),
              netPay: String(calc.netPay),
              status: "pending",
            })
            .onConflictDoNothing()
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
