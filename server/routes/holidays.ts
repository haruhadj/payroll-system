import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { holidays } from "@/lib/db/schema"
import { insertHolidaySchema, updateHolidaySchema } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { eq } from "drizzle-orm"

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  .get("/", async (c) => {
    const rows = await db.query.holidays.findMany({
      orderBy: (t, { asc }) => [asc(t.date)],
    })
    return c.json(rows)
  })

  .post(
    "/",
    requireRole("admin", "hr"),
    zValidator("json", insertHolidaySchema),
    async (c) => {
      const data = c.req.valid("json")
      const existing = await db.query.holidays.findFirst({
        where: eq(holidays.date, data.date),
      })
      if (existing) {
        return c.json({ error: "A holiday already exists on this date" }, 400)
      }
      const [created] = await db.insert(holidays).values(data).returning()
      return c.json(created, 201)
    },
  )

  .patch(
    "/:id",
    requireRole("admin", "hr"),
    zValidator("json", updateHolidaySchema),
    async (c) => {
      const id = c.req.param("id")!
      const data = c.req.valid("json")
      const [updated] = await db
        .update(holidays)
        .set(data)
        .where(eq(holidays.id, id))
        .returning()
      if (!updated) return c.json({ error: "Not found" }, 404)
      return c.json(updated)
    },
  )

  .delete("/:id", requireRole("admin", "hr"), async (c) => {
    const id = c.req.param("id")!
    const [deleted] = await db
      .delete(holidays)
      .where(eq(holidays.id, id))
      .returning({ id: holidays.id })
    if (!deleted) return c.json({ error: "Not found" }, 404)
    return c.json({ success: true })
  })

export { router as holidaysRouter }
