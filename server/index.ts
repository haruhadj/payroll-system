import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { authMiddleware } from "./middleware/auth"
import { requireRole } from "./middleware/rbac"
import type { HonoVariables } from "./types"
import { employeesRouter } from "./routes/employees"
import { payrollRouter } from "./routes/payroll"
import { payslipsRouter } from "./routes/payslips"
import { feedbackRouter } from "./routes/feedback"
import { dashboardRouter } from "./routes/dashboard"

const usersRouter = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)
  .get("/", requireRole("admin", "hr"), async (c) => {
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
    return c.json(rows)
  })
  .patch(
    "/:userId/role",
    requireRole("admin"),
    zValidator("json", z.object({ role: z.enum(["admin", "hr", "employee"]) })),
    async (c) => {
      const userId = c.req.param("userId")
      const { role } = c.req.valid("json")
      const [updated] = await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning()
      if (!updated) return c.json({ error: "Not found" }, 404)
      return c.json(updated)
    },
  )

const app = new Hono()
  .basePath("/api")
  .route("/employees", employeesRouter)
  .route("/payroll", payrollRouter)
  .route("/payslips", payslipsRouter)
  .route("/feedback", feedbackRouter)
  .route("/dashboard", dashboardRouter)
  .route("/users", usersRouter)

export type AppType = typeof app
export { app }
