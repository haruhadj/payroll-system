import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { designations, groups, teams, optionSchema } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { asc, eq } from "drizzle-orm"

const TABLES = { designation: designations, group: groups, team: teams } as const
type OptionType = keyof typeof TABLES

function resolve(type: string | undefined) {
  return type ? (TABLES[type as OptionType] ?? null) : null
}

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  // All three lists in one payload.
  .get("/", async (c) => {
    const [d, g, t] = await Promise.all([
      db.select().from(designations).orderBy(asc(designations.name)),
      db.select().from(groups).orderBy(asc(groups.name)),
      db.select().from(teams).orderBy(asc(teams.name)),
    ])
    return c.json({ designations: d, groups: g, teams: t })
  })

  .post(
    "/:type",
    requireRole("admin", "hr"),
    zValidator("json", optionSchema),
    async (c) => {
      const table = resolve(c.req.param("type"))
      if (!table) return c.json({ error: "Invalid option type" }, 400)
      const { name } = c.req.valid("json")
      try {
        const [row] = await db.insert(table).values({ name }).returning()
        return c.json(row, 201)
      } catch {
        return c.json({ error: "That option already exists" }, 400)
      }
    },
  )

  .patch(
    "/:type/:id",
    requireRole("admin", "hr"),
    zValidator("json", optionSchema),
    async (c) => {
      const table = resolve(c.req.param("type"))
      if (!table) return c.json({ error: "Invalid option type" }, 400)
      const id = c.req.param("id")!
      const { name } = c.req.valid("json")
      const [row] = await db
        .update(table)
        .set({ name })
        .where(eq(table.id, id))
        .returning()
      if (!row) return c.json({ error: "Not found" }, 404)
      return c.json(row)
    },
  )

  .delete("/:type/:id", requireRole("admin", "hr"), async (c) => {
    const table = resolve(c.req.param("type"))
    if (!table) return c.json({ error: "Invalid option type" }, 400)
    const id = c.req.param("id")!
    const [row] = await db.delete(table).where(eq(table.id, id)).returning({ id: table.id })
    if (!row) return c.json({ error: "Not found" }, 404)
    return c.json({ success: true })
  })

export { router as optionsRouter }
