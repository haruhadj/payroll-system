import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { employees, users } from "@/lib/db/schema"
import { createEmployeeWithUserSchema, updateEmployeeSchema } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { auth } from "@/lib/auth/server"
import { eq, ilike, and } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

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
    zValidator("json", createEmployeeWithUserSchema),
    async (c) => {
      const { name, email, password, role, ...employeeData } = c.req.valid("json")

      const requester = c.get("user")
      if (role !== "employee" && requester.role !== "admin") {
        return c.json({ error: "Only admins can create admin or HR accounts" }, 403)
      }

      const existing = await db.select().from(users).where(eq(users.email, email))
      if (existing.length) {
        return c.json({ error: "A user with this email already exists" }, 400)
      }

      let newUserId: string
      try {
        const result = await auth.api.signUpEmail({ body: { name, email, password } })
        if (!result?.user?.id) {
          return c.json({ error: "Failed to create user account" }, 400)
        }
        newUserId = result.user.id
      } catch (e: any) {
        return c.json(
          { error: e?.body?.message ?? e?.message ?? "Failed to create user account" },
          400,
        )
      }

      await db
        .update(users)
        .set({ role, emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, newUserId))

      try {
        const [created] = await db
          .insert(employees)
          .values({ ...employeeData, userId: newUserId })
          .returning()
        return c.json(created, 201)
      } catch (e: any) {
        await db.delete(users).where(eq(users.id, newUserId))
        return c.json({ error: e?.message ?? "Failed to create employee record" }, 400)
      }
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
