import { Hono } from "hono"
import { db } from "@/lib/db"
import { employees, payrollPeriods, payslips, feedback } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { eq, count, avg } from "drizzle-orm"

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)
  .use(requireRole("admin", "hr"))

  .get("/overview", async (c) => {
    const [empCount] = await db.select({ count: count() }).from(employees)
    const [pendingCount] = await db
      .select({ count: count() })
      .from(payslips)
      .where(eq(payslips.status, "pending"))
    const [feedbackAvg] = await db.select({ avg: avg(feedback.rating) }).from(feedback)
    const latestPeriod = await db.query.payrollPeriods.findFirst({
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })
    const recentFeedback = await db.query.feedback.findMany({
      with: { employee: { with: { user: { columns: { name: true } } } } },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 5,
    })
    const [activeCount] = await db
      .select({ count: count() })
      .from(payrollPeriods)
      .where(eq(payrollPeriods.status, "processed"))

    return c.json({
      totalEmployees: empCount.count,
      activePayrollPeriods: activeCount.count,
      pendingPayslips: pendingCount.count,
      averageFeedbackRating: feedbackAvg.avg
        ? Math.round(parseFloat(feedbackAvg.avg as string) * 10) / 10
        : null,
      latestPeriod: latestPeriod ?? null,
      recentFeedback: recentFeedback.map((f) => ({
        rating: f.rating,
        comment: f.comment,
        employee: f.employee.user.name,
        createdAt: f.createdAt,
      })),
    })
  })

  .get("/reports/payroll-summary", async (c) => {
    const { periodId } = c.req.query()

    const periodsQuery = periodId
      ? await db.query.payrollPeriods.findMany({
          where: eq(payrollPeriods.id, periodId),
        })
      : await db.query.payrollPeriods.findMany({
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        })

    const result = await Promise.all(
      periodsQuery.map(async (period) => {
        const slips = await db.query.payslips.findMany({
          where: eq(payslips.periodId, period.id),
          with: { employee: { with: { user: { columns: { name: true } } } } },
        })
        const totalGross = slips.reduce((s, r) => s + parseFloat(r.grossPay as string), 0)
        const totalNet = slips.reduce((s, r) => s + parseFloat(r.netPay as string), 0)
        return {
          periodId: period.id,
          label: period.label,
          totalEmployees: slips.length,
          totalGrossPay: Math.round(totalGross * 100) / 100,
          totalDeductions: Math.round((totalGross - totalNet) * 100) / 100,
          totalNetPay: Math.round(totalNet * 100) / 100,
          payslips: slips.map((s) => ({
            employeeNo: s.employee.employeeNo,
            name: s.employee.user.name,
            grossPay: parseFloat(s.grossPay as string),
            netPay: parseFloat(s.netPay as string),
          })),
        }
      }),
    )

    return c.json({ generatedAt: new Date().toISOString(), periods: result })
  })

export { router as dashboardRouter }
