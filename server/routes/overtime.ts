import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { overtimeRequests, employees } from "@/lib/db/schema"
import { createOvertimeRequestSchema } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { and, eq, gte, lte, desc } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { z } from "zod"

async function ownEmployeeId(userId: string): Promise<string | null> {
  const [emp] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, userId))
  return emp?.id ?? null
}

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  .get("/", async (c) => {
    const user = c.get("user")
    const { status, employeeId, from, to } = c.req.query()

    const conditions: SQL[] = []
    if (user.role === "employee") {
      const id = await ownEmployeeId(user.id)
      if (!id) return c.json([])
      conditions.push(eq(overtimeRequests.employeeId, id))
    } else if (employeeId) {
      conditions.push(eq(overtimeRequests.employeeId, employeeId))
    }
    if (status) {
      conditions.push(
        eq(overtimeRequests.status, status as "pending" | "approved" | "rejected"),
      )
    }
    if (from) conditions.push(gte(overtimeRequests.date, from))
    if (to) conditions.push(lte(overtimeRequests.date, to))

    const rows = await db.query.overtimeRequests.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        employee: {
          columns: { id: true, employeeNo: true },
          with: { user: { columns: { name: true } } },
        },
        approver: { columns: { name: true } },
      },
      orderBy: [desc(overtimeRequests.date)],
    })
    return c.json(rows)
  })

  .post("/", zValidator("json", createOvertimeRequestSchema), async (c) => {
    const user = c.get("user")
    const data = c.req.valid("json")

    let employeeId = data.employeeId
    if (user.role === "employee") {
      const id = await ownEmployeeId(user.id)
      if (!id) return c.json({ error: "No employee record for this user" }, 400)
      employeeId = id
    }
    if (!employeeId) {
      return c.json({ error: "employeeId is required" }, 400)
    }
    if (data.timeTo <= data.timeFrom) {
      return c.json({ error: "End time must be after start time" }, 400)
    }

    const [created] = await db
      .insert(overtimeRequests)
      .values({
        employeeId,
        date: data.date,
        timeFrom: data.timeFrom,
        timeTo: data.timeTo,
        hours: data.hours,
        note: data.note ?? null,
      })
      .returning()
    return c.json(created, 201)
  })

  .patch(
    "/:id",
    requireRole("admin", "hr"),
    zValidator("json", z.object({ status: z.enum(["approved", "rejected"]) })),
    async (c) => {
      const user = c.get("user")
      const id = c.req.param("id")!
      const { status } = c.req.valid("json")

      const request = await db.query.overtimeRequests.findFirst({
        where: eq(overtimeRequests.id, id),
      })
      if (!request) return c.json({ error: "Not found" }, 404)
      if (request.status !== "pending") {
        return c.json({ error: "Only pending requests can be updated" }, 400)
      }

      const [updated] = await db
        .update(overtimeRequests)
        .set({ status, approvedBy: user.id })
        .where(eq(overtimeRequests.id, id))
        .returning()
      return c.json(updated)
    },
  )

  .delete("/:id", async (c) => {
    const user = c.get("user")
    const id = c.req.param("id")!

    const request = await db.query.overtimeRequests.findFirst({
      where: eq(overtimeRequests.id, id),
    })
    if (!request) return c.json({ error: "Not found" }, 404)

    if (user.role === "employee") {
      const ownId = await ownEmployeeId(user.id)
      if (request.employeeId !== ownId || request.status !== "pending") {
        return c.json({ error: "Forbidden" }, 403)
      }
    }

    await db.delete(overtimeRequests).where(eq(overtimeRequests.id, id))
    return c.json({ success: true })
  })

export { router as overtimeRouter }
