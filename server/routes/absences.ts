import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { absences, employees } from "@/lib/db/schema"
import { insertAbsenceSchema } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { and, eq, gte, lte, desc } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  // Employees can only see their own absence records.
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
      conditions.push(eq(absences.employeeId, emp.id))
    } else if (employeeId) {
      conditions.push(eq(absences.employeeId, employeeId))
    }

    if (from) conditions.push(gte(absences.date, from))
    if (to) conditions.push(lte(absences.date, to))

    const rows = await db.query.absences.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        employee: {
          columns: { id: true, employeeNo: true },
          with: { user: { columns: { name: true } } },
        },
      },
      orderBy: [desc(absences.date)],
      limit: parseInt(limit),
    })
    return c.json(rows)
  })

  .post(
    "/",
    requireRole("admin", "hr"),
    zValidator("json", insertAbsenceSchema),
    async (c) => {
      const user = c.get("user")
      const data = c.req.valid("json")
      const existing = await db.query.absences.findFirst({
        where: and(
          eq(absences.employeeId, data.employeeId),
          eq(absences.date, data.date),
        ),
      })
      if (existing) {
        return c.json(
          { error: "An absence is already logged for this employee on this date" },
          400,
        )
      }
      const [created] = await db
        .insert(absences)
        .values({ ...data, createdBy: user.id })
        .returning()
      return c.json(created, 201)
    },
  )

  .delete("/:id", requireRole("admin", "hr"), async (c) => {
    const id = c.req.param("id")!
    const [deleted] = await db
      .delete(absences)
      .where(eq(absences.id, id))
      .returning({ id: absences.id })
    if (!deleted) return c.json({ error: "Not found" }, 404)
    return c.json({ success: true })
  })

export { router as absencesRouter }
