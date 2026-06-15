import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { loans, employees } from "@/lib/db/schema"
import { insertLoanSchema, updateLoanSchema } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { and, eq, desc } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  .get("/", async (c) => {
    const user = c.get("user")
    const { employeeId, status } = c.req.query()

    const conditions: SQL[] = []
    if (user.role === "employee") {
      const [emp] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.userId, user.id))
      if (!emp) return c.json([])
      conditions.push(eq(loans.employeeId, emp.id))
    } else if (employeeId) {
      conditions.push(eq(loans.employeeId, employeeId))
    }
    if (status) {
      conditions.push(
        eq(loans.status, status as "active" | "paid" | "cancelled"),
      )
    }

    const rows = await db.query.loans.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        employee: {
          columns: { id: true, employeeNo: true },
          with: { user: { columns: { name: true } } },
        },
      },
      orderBy: [desc(loans.createdAt)],
    })
    return c.json(rows)
  })

  .post(
    "/",
    requireRole("admin", "hr"),
    zValidator("json", insertLoanSchema),
    async (c) => {
      const data = c.req.valid("json")
      // A new loan's outstanding balance defaults to its full principal.
      const [created] = await db
        .insert(loans)
        .values({ ...data, balance: data.balance ?? data.principal })
        .returning()
      return c.json(created, 201)
    },
  )

  .patch(
    "/:id",
    requireRole("admin", "hr"),
    zValidator("json", updateLoanSchema),
    async (c) => {
      const id = c.req.param("id")!
      const data = c.req.valid("json")
      const [updated] = await db
        .update(loans)
        .set(data)
        .where(eq(loans.id, id))
        .returning()
      if (!updated) return c.json({ error: "Not found" }, 404)
      return c.json(updated)
    },
  )

  .delete("/:id", requireRole("admin", "hr"), async (c) => {
    const id = c.req.param("id")!
    const [deleted] = await db
      .delete(loans)
      .where(eq(loans.id, id))
      .returning({ id: loans.id })
    if (!deleted) return c.json({ error: "Not found" }, 404)
    return c.json({ success: true })
  })

export { router as loansRouter }
