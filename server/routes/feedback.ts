import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { employees, feedback, payrollPeriods } from "@/lib/db/schema"
import { insertFeedbackSchema } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { eq, and } from "drizzle-orm"

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  .post("/", zValidator("json", insertFeedbackSchema), async (c) => {
    const user = c.get("user")
    if (user.role !== "employee") {
      return c.json({ error: "Only employees can submit feedback" }, 403)
    }

    const data = c.req.valid("json")

    const period = await db.query.payrollPeriods.findFirst({
      where: eq(payrollPeriods.id, data.periodId),
    })
    if (!period) return c.json({ error: "Period not found" }, 404)
    if (period.status !== "released") {
      return c.json({ error: "Feedback only allowed on released periods" }, 400)
    }

    const emp = await db.query.employees.findFirst({
      where: eq(employees.userId, user.id),
    })
    if (!emp) return c.json({ error: "No employee record found" }, 404)

    const existing = await db.query.feedback.findFirst({
      where: and(eq(feedback.employeeId, emp.id), eq(feedback.periodId, data.periodId)),
    })
    if (existing) return c.json({ error: "Feedback already submitted for this period" }, 409)

    const [created] = await db
      .insert(feedback)
      .values({ ...data, employeeId: emp.id })
      .returning()
    return c.json(created, 201)
  })

  .get("/mine", async (c) => {
    const user = c.get("user")
    const emp = await db.query.employees.findFirst({
      where: eq(employees.userId, user.id),
    })
    if (!emp) return c.json([])

    const rows = await db.query.feedback.findMany({
      where: eq(feedback.employeeId, emp.id),
      with: { period: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })
    return c.json(rows)
  })

  .get("/summary", requireRole("admin", "hr"), async (c) => {
    const { periodId } = c.req.query()

    const rows = await db.query.feedback.findMany({
      where: periodId ? eq(feedback.periodId, periodId) : undefined,
      with: { period: { columns: { id: true, label: true } } },
    })

    const totalResponses = rows.length
    const averageRating =
      totalResponses > 0
        ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / totalResponses) * 10) / 10
        : 0

    const dist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }
    for (const r of rows) dist[String(r.rating)]++

    const periodMap = new Map<string, { label: string; sum: number; count: number }>()
    for (const r of rows) {
      const existing = periodMap.get(r.periodId) ?? { label: r.period.label, sum: 0, count: 0 }
      existing.sum += r.rating
      existing.count++
      periodMap.set(r.periodId, existing)
    }

    const periods = Array.from(periodMap.entries()).map(([pid, v]) => ({
      periodId: pid,
      label: v.label,
      avgRating: Math.round((v.sum / v.count) * 10) / 10,
      responseCount: v.count,
    }))

    return c.json({ totalResponses, averageRating, ratingDistribution: dist, periods })
  })

  .get("/", requireRole("admin", "hr"), async (c) => {
    const { periodId, employeeId, limit = "50", offset = "0" } = c.req.query()

    const conditions: any[] = []
    if (periodId) conditions.push(eq(feedback.periodId, periodId))
    if (employeeId) conditions.push(eq(feedback.employeeId, employeeId))

    const rows = await db.query.feedback.findMany({
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

export { router as feedbackRouter }
