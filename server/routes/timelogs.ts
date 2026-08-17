import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { timeLogs, employees } from "@/lib/db/schema"
import { insertTimeLogSchema, updateTimeLogSchema } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { and, eq, gte, lte, desc } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { getOrgLocalDateKey as todayKey } from "@/lib/timezone"

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  // Employees can only see their own time logs.
  .get("/", async (c) => {
    const user = c.get("user")
    const { employeeId, from, to, limit = "100" } = c.req.query()

    const conditions: SQL[] = []

    if (user.role === "employee") {
      const [emp] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.userId, user.id))
      if (!emp) return c.json([])
      conditions.push(eq(timeLogs.employeeId, emp.id))
    } else if (employeeId) {
      conditions.push(eq(timeLogs.employeeId, employeeId))
    }

    if (from) conditions.push(gte(timeLogs.date, from))
    if (to) conditions.push(lte(timeLogs.date, to))

    const rows = await db.query.timeLogs.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        employee: {
          columns: { id: true, employeeNo: true },
          with: { user: { columns: { name: true } } },
        },
      },
      orderBy: [desc(timeLogs.date)],
      limit: parseInt(limit),
    })
    return c.json(rows)
  })

  // Self-service clock-in: creates today's row for the calling employee.
  .post("/clock-in", async (c) => {
    const user = c.get("user")
    const [emp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.userId, user.id))
    if (!emp) return c.json({ error: "No employee record for this user" }, 400)

    const date = todayKey()
    const existing = await db.query.timeLogs.findFirst({
      where: and(eq(timeLogs.employeeId, emp.id), eq(timeLogs.date, date)),
    })
    if (existing?.timeIn) {
      return c.json({ error: "Already clocked in today" }, 400)
    }
    if (existing) {
      const [updated] = await db
        .update(timeLogs)
        .set({ timeIn: new Date(), source: "self" })
        .where(eq(timeLogs.id, existing.id))
        .returning()
      return c.json(updated)
    }
    const [created] = await db
      .insert(timeLogs)
      .values({ employeeId: emp.id, date, timeIn: new Date(), source: "self" })
      .returning()
    return c.json(created, 201)
  })

  // Self-service clock-out: updates today's row for the calling employee.
  .post("/clock-out", async (c) => {
    const user = c.get("user")
    const [emp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.userId, user.id))
    if (!emp) return c.json({ error: "No employee record for this user" }, 400)

    const date = todayKey()
    const existing = await db.query.timeLogs.findFirst({
      where: and(eq(timeLogs.employeeId, emp.id), eq(timeLogs.date, date)),
    })
    if (!existing || !existing.timeIn) {
      return c.json({ error: "You haven't clocked in today" }, 400)
    }
    if (existing.timeOut) {
      return c.json({ error: "Already clocked out today" }, 400)
    }
    const [updated] = await db
      .update(timeLogs)
      .set({ timeOut: new Date() })
      .where(eq(timeLogs.id, existing.id))
      .returning()
    return c.json(updated)
  })

  // Admin/HR manual entry.
  .post(
    "/",
    requireRole("admin", "hr"),
    zValidator("json", insertTimeLogSchema),
    async (c) => {
      const user = c.get("user")
      const data = c.req.valid("json")
      const existing = await db.query.timeLogs.findFirst({
        where: and(
          eq(timeLogs.employeeId, data.employeeId),
          eq(timeLogs.date, data.date),
        ),
      })
      if (existing) {
        return c.json(
          { error: "A time log already exists for this employee on this date" },
          400,
        )
      }
      const [created] = await db
        .insert(timeLogs)
        .values({ ...data, source: "manual", createdBy: user.id })
        .returning()
      return c.json(created, 201)
    },
  )

  // Admin/HR correction.
  .patch(
    "/:id",
    requireRole("admin", "hr"),
    zValidator("json", updateTimeLogSchema),
    async (c) => {
      const id = c.req.param("id")!
      const data = c.req.valid("json")
      const [updated] = await db
        .update(timeLogs)
        .set(data)
        .where(eq(timeLogs.id, id))
        .returning()
      if (!updated) return c.json({ error: "Not found" }, 404)
      return c.json(updated)
    },
  )

  .delete("/:id", requireRole("admin", "hr"), async (c) => {
    const id = c.req.param("id")!
    const [deleted] = await db
      .delete(timeLogs)
      .where(eq(timeLogs.id, id))
      .returning({ id: timeLogs.id })
    if (!deleted) return c.json({ error: "Not found" }, 404)
    return c.json({ success: true })
  })

export { router as timeLogsRouter }
