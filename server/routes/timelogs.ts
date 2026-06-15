import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { timeLogs, employees, schedules, payrollSettings } from "@/lib/db/schema"
import { insertTimeLogSchema, updateTimeLogSchema } from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { and, eq, gte, lte, desc } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  .get("/", async (c) => {
    const user = c.get("user")
    const { employeeId, from, to, limit = "100" } = c.req.query()

    const conditions: SQL[] = []

    // Employees can only see their own logs.
    if (user.role === "employee") {
      const [emp] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.userId, user.id))
      if (!emp) return c.json([])
      conditions.push(eq(timeLogs.employeeId, emp.id))
    } else if (employeeId) {
      conditions.push(eq(timeLogs.employeeId, employeeId))
    }

    if (from) conditions.push(gte(timeLogs.logDate, from))
    if (to) conditions.push(lte(timeLogs.logDate, to))

    const rows = await db.query.timeLogs.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        employee: {
          columns: { id: true, employeeNo: true },
          with: { user: { columns: { name: true } } },
        },
      },
      orderBy: [desc(timeLogs.logDate), desc(timeLogs.amIn)],
      limit: parseInt(limit),
    })
    return c.json(rows)
  })

  // Daily time card for every active employee on a given date.
  .get("/timecard", requireRole("admin", "hr"), async (c) => {
    const date = c.req.query("date") || today()

    const [emps, logs, scheds, settings] = await Promise.all([
      db.query.employees.findMany({
        where: eq(employees.isActive, true),
        with: { user: { columns: { name: true } } },
      }),
      db.query.timeLogs.findMany({ where: eq(timeLogs.logDate, date) }),
      db.select().from(schedules),
      db.query.payrollSettings.findFirst(),
    ])

    const logByEmp = new Map(logs.map((l) => [l.employeeId, l]))
    const schedById = new Map(scheds.map((s) => [s.id, s]))
    const grace = settings?.lateGracePeriodMinutes ?? 0

    const seg = (a: Date | null, b: Date | null) =>
      a && b ? Math.max(0, (b.getTime() - a.getTime()) / 3_600_000) : 0

    let totWork = 0
    let totOt = 0
    let totLate = 0

    const rows = emps.map((e) => {
      const l = logByEmp.get(e.id)
      const sched = e.scheduleId ? schedById.get(e.scheduleId) : null
      const amIn = l?.amIn ?? null
      const lastOut = l?.pmOut ?? l?.amOut ?? null
      const firstIn = l?.amIn ?? l?.pmIn ?? null

      const amHrs = seg(l?.amIn ?? null, l?.amOut ?? null)
      const pmHrs = seg(l?.pmIn ?? null, l?.pmOut ?? null)
      let workHours = amHrs + pmHrs
      if (workHours === 0 && firstIn && lastOut) {
        workHours = Math.max(0, seg(firstIn, lastOut) - (sched?.breakMinutes ?? 60) / 60)
      }
      const otHours = seg(l?.otIn ?? null, l?.otOut ?? null)

      let lateMinutes = 0
      if (sched && amIn) {
        const [sh, sm] = sched.timeIn.split(":").map(Number)
        const schedStart = new Date(amIn)
        schedStart.setHours(sh, sm, 0, 0)
        lateMinutes = Math.max(
          0,
          (amIn.getTime() - schedStart.getTime()) / 60_000 - grace,
        )
      }

      totWork += workHours
      totOt += otHours
      totLate += lateMinutes

      return {
        employeeId: e.id,
        employeeNo: e.employeeNo,
        name: e.user?.name ?? e.employeeNo,
        scheduleName: sched?.name ?? "Open Schedule",
        amIn: l?.amIn ?? null,
        amOut: l?.amOut ?? null,
        pmIn: l?.pmIn ?? null,
        pmOut: l?.pmOut ?? null,
        otIn: l?.otIn ?? null,
        otOut: l?.otOut ?? null,
        otHours: Math.round(otHours * 100) / 100,
        lateMinutes: Math.round(lateMinutes),
        workHours: Math.round(workHours * 100) / 100,
      }
    })

    return c.json({
      date,
      rows,
      totals: {
        workHours: Math.round(totWork * 100) / 100,
        otHours: Math.round(totOt * 100) / 100,
        lateMinutes: Math.round(totLate),
      },
    })
  })

  // Biometric mock: randomly clock a fingerprint scan in or out for the day.
  .post("/scan", requireRole("admin", "hr"), async (c) => {
    const activeEmployees = await db.query.employees.findMany({
      where: eq(employees.isActive, true),
      with: { user: { columns: { name: true } } },
    })
    if (!activeEmployees.length) {
      return c.json({ error: "No active employees to scan" }, 400)
    }

    const logDate = today()
    const todays = await db.query.timeLogs.findMany({
      where: eq(timeLogs.logDate, logDate),
    })
    const logByEmp = new Map(todays.map((l) => [l.employeeId, l]))

    // Biometric scans fill the four regular punches in order; OT is requested
    // and entered manually rather than auto-scanned.
    const SEQUENCE = ["amIn", "amOut", "pmIn", "pmOut"] as const
    const LABELS: Record<(typeof SEQUENCE)[number], string> = {
      amIn: "AM in",
      amOut: "AM out",
      pmIn: "PM in",
      pmOut: "PM out",
    }
    const nextPunch = (l: (typeof todays)[number] | undefined) => {
      if (!l) return "amIn" as const
      return SEQUENCE.find((p) => !l[p]) ?? null
    }

    // Prefer employees who still have a punch pending for a livelier demo.
    const pending = activeEmployees.filter(
      (e) => nextPunch(logByEmp.get(e.id)) !== null,
    )
    const pool = pending.length ? pending : activeEmployees
    const emp = pool[Math.floor(Math.random() * pool.length)]
    const name = emp.user?.name ?? emp.employeeNo
    const existing = logByEmp.get(emp.id)
    const punch = nextPunch(existing)
    const now = new Date()

    if (punch === null) {
      return c.json({
        action: "done",
        employeeName: name,
        employeeNo: emp.employeeNo,
        log: existing,
      })
    }

    if (!existing) {
      const [log] = await db
        .insert(timeLogs)
        .values({ employeeId: emp.id, logDate, amIn: now, source: "biometric" })
        .returning()
      return c.json({
        action: LABELS.amIn,
        employeeName: name,
        employeeNo: emp.employeeNo,
        log,
      })
    }

    const [log] = await db
      .update(timeLogs)
      .set({ [punch]: now, source: "biometric" })
      .where(eq(timeLogs.id, existing.id))
      .returning()
    return c.json({
      action: LABELS[punch],
      employeeName: name,
      employeeNo: emp.employeeNo,
      log,
    })
  })

  .post(
    "/",
    requireRole("admin", "hr"),
    zValidator("json", insertTimeLogSchema),
    async (c) => {
      const data = c.req.valid("json")
      const existing = await db.query.timeLogs.findFirst({
        where: and(
          eq(timeLogs.employeeId, data.employeeId),
          eq(timeLogs.logDate, data.logDate),
        ),
      })
      if (existing) {
        return c.json(
          { error: "A log already exists for this employee on this date" },
          400,
        )
      }
      const [created] = await db
        .insert(timeLogs)
        .values({ ...data, source: "manual" })
        .returning()
      return c.json(created, 201)
    },
  )

  .patch(
    "/:id",
    requireRole("admin", "hr"),
    zValidator("json", updateTimeLogSchema),
    async (c) => {
      const id = c.req.param("id")!
      const data = c.req.valid("json")
      const [updated] = await db
        .update(timeLogs)
        .set(data)
        .where(eq(timeLogs.id, id))
        .returning()
      if (!updated) return c.json({ error: "Not found" }, 404)
      return c.json(updated)
    },
  )

  .delete("/:id", requireRole("admin", "hr"), async (c) => {
    const id = c.req.param("id")!
    const [deleted] = await db
      .delete(timeLogs)
      .where(eq(timeLogs.id, id))
      .returning({ id: timeLogs.id })
    if (!deleted) return c.json({ error: "Not found" }, 404)
    return c.json({ success: true })
  })

export { router as timeLogsRouter }
