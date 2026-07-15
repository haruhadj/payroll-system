import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { employees, users, timeLogs } from "@/lib/db/schema"
import { auth } from "@/lib/auth/server"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  // ----- Export employees as CSV --------------------------------------------
  .get("/export/employees", requireRole("admin", "hr"), async (c) => {
    const rows = await db.query.employees.findMany({
      with: { user: { columns: { name: true, email: true } } },
    })
    const header = [
      "employeeNo",
      "name",
      "email",
      "department",
      "position",
      "group",
      "employmentType",
      "basicSalary",
      "allowance",
      "hiredAt",
      "isActive",
    ]
    const lines = rows.map((e) =>
      [
        e.employeeNo,
        e.user?.name ?? "",
        e.user?.email ?? "",
        e.department,
        e.position,
        e.groupName ?? "",
        e.employmentType,
        e.basicSalary,
        e.allowance,
        e.hiredAt,
        e.isActive,
      ]
        .map(csvCell)
        .join(","),
    )
    const csv = [header.join(","), ...lines].join("\n")
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="employees.csv"',
      },
    })
  })

  // ----- Import employees (creates user account + employee) ------------------
  .post(
    "/import/employees",
    requireRole("admin"),
    zValidator(
      "json",
      z.object({
        rows: z.array(
          z.object({
            name: z.string().min(1),
            email: z.string().email(),
            password: z.string().min(8),
            employeeNo: z.string().min(1),
            department: z.string().min(1),
            position: z.string().min(1),
            group: z.string().optional(),
            employmentType: z
              .enum(["full_time", "part_time", "contractual"])
              .default("full_time"),
            basicSalary: z.string(),
            allowance: z.string().optional(),
            hiredAt: z.string(),
          }),
        ),
      }),
    ),
    async (c) => {
      const { rows } = c.req.valid("json")
      let created = 0
      const errors: { row: number; error: string }[] = []

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        try {
          const existing = await db.select().from(users).where(eq(users.email, r.email))
          if (existing.length) throw new Error("Email already exists")

          const result = await auth.api.signUpEmail({
            body: { name: r.name, email: r.email, password: r.password },
          })
          if (!result?.user?.id) throw new Error("Failed to create account")

          await db
            .update(users)
            .set({ role: "employee", emailVerified: true })
            .where(eq(users.id, result.user.id))

          await db.insert(employees).values({
            userId: result.user.id,
            employeeNo: r.employeeNo,
            department: r.department,
            position: r.position,
            groupName: r.group || null,
            employmentType: r.employmentType,
            basicSalary: r.basicSalary,
            allowance: r.allowance || "0",
            hiredAt: r.hiredAt,
          })
          created++
        } catch (e: any) {
          errors.push({ row: i + 1, error: e?.message ?? "Failed" })
        }
      }

      return c.json({ created, errors })
    },
  )

  // ----- Import time records -------------------------------------------------
  .post(
    "/import/timelogs",
    requireRole("admin", "hr"),
    zValidator(
      "json",
      z.object({
        rows: z.array(
          z.object({
            employeeNo: z.string().min(1),
            date: z.string(),
            amIn: z.string().optional(),
            amOut: z.string().optional(),
            pmIn: z.string().optional(),
            pmOut: z.string().optional(),
          }),
        ),
      }),
    ),
    async (c) => {
      const { rows } = c.req.valid("json")
      const empRows = await db.select().from(employees)
      const byNo = new Map(empRows.map((e) => [e.employeeNo, e.id]))

      const toDate = (date: string, t?: string) =>
        t ? new Date(`${date}T${t.length === 5 ? `${t}:00` : t}`) : null

      let imported = 0
      const errors: { row: number; error: string }[] = []

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const empId = byNo.get(r.employeeNo)
        if (!empId) {
          errors.push({ row: i + 1, error: `Unknown employee ${r.employeeNo}` })
          continue
        }
        try {
          const values = {
            employeeId: empId,
            logDate: r.date,
            amIn: toDate(r.date, r.amIn),
            amOut: toDate(r.date, r.amOut),
            pmIn: toDate(r.date, r.pmIn),
            pmOut: toDate(r.date, r.pmOut),
            source: "manual" as const,
          }
          const existing = await db.query.timeLogs.findFirst({
            where: and(eq(timeLogs.employeeId, empId), eq(timeLogs.logDate, r.date)),
          })
          if (existing) {
            await db.update(timeLogs).set(values).where(eq(timeLogs.id, existing.id))
          } else {
            await db.insert(timeLogs).values(values)
          }
          imported++
        } catch (e: any) {
          errors.push({ row: i + 1, error: e?.message ?? "Failed" })
        }
      }

      return c.json({ imported, errors })
    },
  )

export { router as toolsRouter }
