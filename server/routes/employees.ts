import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { employees, users } from "@/lib/db/schema"
import { insertEmployeeSchema, updateEmployeeSchema } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { eq, ilike, and } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  .get("/users/unlinked", requireRole("admin", "hr"), async (c) => {
    const linked = await db.select({ userId: employees.userId }).from(employees)
    const linkedIds = new Set(linked.map((r) => r.userId))
    const allUsers = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
    return c.json(allUsers.filter((u) => !linkedIds.has(u.id)))
  })

  .get("/", async (c) => {
    const user = c.get("user")
    const { department, position, active, limit = "50", offset = "0" } = c.req.query()

    if (user.role === "employee") {
      const [emp] = await db.select().from(employees).where(eq(employees.userId, user.id))
      return c.json(emp ? [emp] : [])
    }

    const conditions: SQL[] = []
    if (department) conditions.push(ilike(employees.department, `%${department}%`))
    if (position) conditions.push(ilike(employees.position, `%${position}%`))
    if (active === "true") conditions.push(eq(employees.isActive, true))
    if (active === "false") conditions.push(eq(employees.isActive, false))

    const rows = await db.query.employees.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        user: { columns: { name: true, email: true } },
        schedule: { columns: { id: true, name: true } },
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
    return c.json(rows)
  })

  .get("/:id", async (c) => {
    const user = c.get("user")
    const id = c.req.param("id")!
    const emp = await db.query.employees.findFirst({
      where: eq(employees.id, id),
      with: {
        user: { columns: { name: true, email: true, role: true } },
        schedule: { columns: { id: true, name: true } },
      },
    })
    if (!emp) return c.json({ error: "Not found" }, 404)
    if (user.role === "employee" && emp.userId !== user.id) {
      return c.json({ error: "Forbidden" }, 403)
    }
    return c.json(emp)
  })

  .post(
    "/",
    requireRole("admin", "hr"),
    zValidator("json", insertEmployeeSchema),
    async (c) => {
      const data = c.req.valid("json")
      const existing = await db.select().from(employees).where(eq(employees.userId, data.userId))
      if (existing.length) {
        return c.json({ error: "Employee record already exists for this user" }, 400)
      }
      const [created] = await db.insert(employees).values(data).returning()
      return c.json(created, 201)
    },
  )

  .patch(
    "/:id",
    requireRole("admin", "hr"),
    zValidator("json", updateEmployeeSchema),
    async (c) => {
      const id = c.req.param("id")!
      const data = c.req.valid("json")
      const [updated] = await db
        .update(employees)
        .set(data)
        .where(eq(employees.id, id))
        .returning()
      if (!updated) return c.json({ error: "Not found" }, 404)
      return c.json(updated)
    },
  )

  .delete("/:id", requireRole("admin"), async (c) => {
    const id = c.req.param("id")!
    const [deleted] = await db.delete(employees).where(eq(employees.id, id)).returning()
    if (!deleted) return c.json({ error: "Not found" }, 404)
    return c.json({ success: true })
  })

export { router as employeesRouter }
