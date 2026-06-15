import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { leaveCredits, leaveRequests, employees } from "@/lib/db/schema"
import {
  upsertLeaveCreditSchema,
  createLeaveRequestSchema,
} from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import { isLeavePaid } from "@/lib/payroll-calc"
import type { HonoVariables } from "@/server/types"
import { and, eq, desc } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { z } from "zod"

// Resolves the employee row for the signed-in user (employee self-service).
async function ownEmployeeId(userId: string): Promise<string | null> {
  const [emp] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, userId))
  return emp?.id ?? null
}

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  // ----- Leave credits ------------------------------------------------------

  .get("/credits", async (c) => {
    const user = c.get("user")
    const { employeeId } = c.req.query()

    const conditions: SQL[] = []
    if (user.role === "employee") {
      const id = await ownEmployeeId(user.id)
      if (!id) return c.json([])
      conditions.push(eq(leaveCredits.employeeId, id))
    } else if (employeeId) {
      conditions.push(eq(leaveCredits.employeeId, employeeId))
    }

    const rows = await db.query.leaveCredits.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        employee: {
          columns: { id: true, employeeNo: true },
          with: { user: { columns: { name: true } } },
        },
      },
      orderBy: [desc(leaveCredits.createdAt)],
    })
    return c.json(rows)
  })

  // Upsert a leave-credit balance for an employee + type.
  .post(
    "/credits",
    requireRole("admin", "hr"),
    zValidator("json", upsertLeaveCreditSchema),
    async (c) => {
      const data = c.req.valid("json")
      const [row] = await db
        .insert(leaveCredits)
        .values(data)
        .onConflictDoUpdate({
          target: [leaveCredits.employeeId, leaveCredits.type],
          set: { balance: data.balance },
        })
        .returning()
      return c.json(row, 201)
    },
  )

  // ----- Leave requests -----------------------------------------------------

  .get("/", async (c) => {
    const user = c.get("user")
    const { status, employeeId } = c.req.query()

    const conditions: SQL[] = []
    if (user.role === "employee") {
      const id = await ownEmployeeId(user.id)
      if (!id) return c.json([])
      conditions.push(eq(leaveRequests.employeeId, id))
    } else if (employeeId) {
      conditions.push(eq(leaveRequests.employeeId, employeeId))
    }
    if (status) {
      conditions.push(
        eq(leaveRequests.status, status as "pending" | "approved" | "rejected"),
      )
    }

    const rows = await db.query.leaveRequests.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        employee: {
          columns: { id: true, employeeNo: true },
          with: { user: { columns: { name: true } } },
        },
        approver: { columns: { name: true } },
      },
      orderBy: [desc(leaveRequests.createdAt)],
    })
    return c.json(rows)
  })

  .post("/", zValidator("json", createLeaveRequestSchema), async (c) => {
    const user = c.get("user")
    const data = c.req.valid("json")

    // Employees may only file for themselves; admin/hr must name an employee.
    let employeeId = data.employeeId
    if (user.role === "employee") {
      const id = await ownEmployeeId(user.id)
      if (!id) return c.json({ error: "No employee record for this user" }, 400)
      employeeId = id
    }
    if (!employeeId) {
      return c.json({ error: "employeeId is required" }, 400)
    }
    if (data.dateTo < data.dateFrom) {
      return c.json({ error: "End date cannot be before start date" }, 400)
    }

    const [created] = await db
      .insert(leaveRequests)
      .values({
        employeeId,
        type: data.type,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        days: data.days,
        reason: data.reason ?? null,
      })
      .returning()
    return c.json(created, 201)
  })

  // Approve or reject. Approving a paid leave deducts the leave-credit balance.
  .patch(
    "/:id",
    requireRole("admin", "hr"),
    zValidator("json", z.object({ status: z.enum(["approved", "rejected"]) })),
    async (c) => {
      const user = c.get("user")
      const id = c.req.param("id")!
      const { status } = c.req.valid("json")

      const request = await db.query.leaveRequests.findFirst({
        where: eq(leaveRequests.id, id),
      })
      if (!request) return c.json({ error: "Not found" }, 404)
      if (request.status !== "pending") {
        return c.json({ error: "Only pending requests can be updated" }, 400)
      }

      if (status === "approved" && isLeavePaid(request.type)) {
        const credit = await db.query.leaveCredits.findFirst({
          where: and(
            eq(leaveCredits.employeeId, request.employeeId),
            eq(leaveCredits.type, request.type),
          ),
        })
        const balance = credit ? parseFloat(credit.balance) : 0
        const days = parseFloat(request.days)
        if (balance < days) {
          return c.json(
            {
              error: `Insufficient ${request.type} leave credits (balance ${balance}, requested ${days})`,
            },
            400,
          )
        }
        await db
          .update(leaveCredits)
          .set({ balance: String(Math.round((balance - days) * 100) / 100) })
          .where(eq(leaveCredits.id, credit!.id))
      }

      const [updated] = await db
        .update(leaveRequests)
        .set({ status, approvedBy: user.id })
        .where(eq(leaveRequests.id, id))
        .returning()
      return c.json(updated)
    },
  )

  .delete("/:id", async (c) => {
    const user = c.get("user")
    const id = c.req.param("id")!

    const request = await db.query.leaveRequests.findFirst({
      where: eq(leaveRequests.id, id),
    })
    if (!request) return c.json({ error: "Not found" }, 404)

    // Employees may only cancel their own still-pending requests.
    if (user.role === "employee") {
      const ownId = await ownEmployeeId(user.id)
      if (request.employeeId !== ownId || request.status !== "pending") {
        return c.json({ error: "Forbidden" }, 403)
      }
    }

    await db.delete(leaveRequests).where(eq(leaveRequests.id, id))
    return c.json({ success: true })
  })

export { router as leavesRouter }
