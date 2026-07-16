import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { auth } from "@/lib/auth/server"
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
import { absencesRouter } from "./routes/absences"
import { settingsRouter } from "./routes/settings"
import { leavesRouter } from "./routes/leaves"
import { loansRouter } from "./routes/loans"
import { optionsRouter } from "./routes/options"
import { profileRouter } from "./routes/profile"
import { toolsRouter } from "./routes/tools"

const usersRouter = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)
  .get("/", requireRole("admin", "hr"), async (c) => {
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
    return c.json(rows)
  })
  .post(
    "/",
    requireRole("admin"),
    zValidator(
      "json",
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        role: z.enum(["admin", "hr", "employee"]).default("employee"),
      }),
    ),
    async (c) => {
      const { name, email, password, role } = c.req.valid("json")

      const existing = await db.select().from(users).where(eq(users.email, email))
      if (existing.length) {
        return c.json({ error: "A user with this email already exists" }, 400)
      }

      let newUserId: string
      try {
        const result = await auth.api.signUpEmail({
          body: { name, email, password },
        })
        if (!result?.user?.id) {
          return c.json({ error: "Failed to create user" }, 400)
        }
        newUserId = result.user.id
      } catch (e: any) {
        return c.json(
          { error: e?.body?.message ?? e?.message ?? "Failed to create user" },
          400,
        )
      }

      const [updated] = await db
        .update(users)
        .set({ role, emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, newUserId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
        })

      return c.json(updated, 201)
    },
  )
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
  .delete("/:userId", requireRole("admin"), async (c) => {
    const userId = c.req.param("userId")!
    const current = c.get("user")
    if (current.id === userId) {
      return c.json({ error: "You cannot delete your own account" }, 400)
    }
    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id })
    if (!deleted) return c.json({ error: "Not found" }, 404)
    return c.json({ success: true })
  })

const app = new Hono()
  .basePath("/api")
  .route("/employees", employeesRouter)
  .route("/payroll", payrollRouter)
  .route("/payslips", payslipsRouter)
  .route("/feedback", feedbackRouter)
  .route("/dashboard", dashboardRouter)
  .route("/users", usersRouter)
  .route("/absences", absencesRouter)
  .route("/settings", settingsRouter)
  .route("/leaves", leavesRouter)
  .route("/loans", loansRouter)
  .route("/options", optionsRouter)
  .route("/profile", profileRouter)
  .route("/tools", toolsRouter)

export type AppType = typeof app
export { app }
