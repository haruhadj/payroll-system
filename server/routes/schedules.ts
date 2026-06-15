import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { schedules } from "@/lib/db/schema"
import { insertScheduleSchema, updateScheduleSchema } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { eq } from "drizzle-orm"

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  .get("/", async (c) => {
    const rows = await db.query.schedules.findMany({
      orderBy: (t, { asc }) => [asc(t.name)],
    })
    return c.json(rows)
  })

  .get("/:id", async (c) => {
    const id = c.req.param("id")!
    const row = await db.query.schedules.findFirst({ where: eq(schedules.id, id) })
    if (!row) return c.json({ error: "Not found" }, 404)
    return c.json(row)
  })

  .post(
    "/",
    requireRole("admin", "hr"),
    zValidator("json", insertScheduleSchema),
    async (c) => {
      const data = c.req.valid("json")
      const [created] = await db.insert(schedules).values(data).returning()
      return c.json(created, 201)
    },
  )

  .patch(
    "/:id",
    requireRole("admin", "hr"),
    zValidator("json", updateScheduleSchema),
    async (c) => {
      const id = c.req.param("id")!
      const data = c.req.valid("json")
      const [updated] = await db
        .update(schedules)
        .set(data)
        .where(eq(schedules.id, id))
        .returning()
      if (!updated) return c.json({ error: "Not found" }, 404)
      return c.json(updated)
    },
  )

  .delete("/:id", requireRole("admin", "hr"), async (c) => {
    const id = c.req.param("id")!
    const [deleted] = await db
      .delete(schedules)
      .where(eq(schedules.id, id))
      .returning({ id: schedules.id })
    if (!deleted) return c.json({ error: "Not found" }, 404)
    return c.json({ success: true })
  })

export { router as schedulesRouter }
