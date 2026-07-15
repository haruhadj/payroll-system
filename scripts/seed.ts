import { db } from "@/lib/db"
import {
  users,
  employees,
  schedules,
  holidays,
  timeLogs,
  payrollSettings,
  payrollPeriods,
  leaveCredits,
  leaveRequests,
  loans,
  designations,
  groups,
  teams,
  companyProfile,
} from "@/lib/db/schema"
import { auth } from "@/lib/auth/server"
import { eq } from "drizzle-orm"

const seedUsers = [
  {
    name: "Admin User",
    email: "admin@payroll.com",
    password: "Admin@123456",
    role: "admin" as const,
  },
  {
    name: "HR Manager",
    email: "hr@payroll.com",
    password: "Hr@123456",
    role: "hr" as const,
  },
  {
    name: "Juan dela Cruz",
    email: "juan.delacruz@payroll.com",
    password: "Employee@123",
    role: "employee" as const,
  },
  {
    name: "Maria Santos",
    email: "maria.santos@payroll.com",
    password: "Employee@123",
    role: "employee" as const,
  },
]

// Employee records keyed by user email.
const seedEmployees: Record<
  string,
  {
    employeeNo: string
    department: string
    position: string
    groupName: string
    employmentType: "full_time" | "part_time" | "contractual"
    basicSalary: string
    allowance: string
    hiredAt: string
  }
> = {
  "juan.delacruz@payroll.com": {
    employeeNo: "EMP-001",
    department: "Accounting",
    position: "Supervisor",
    groupName: "Regular",
    employmentType: "full_time",
    basicSalary: "30000",
    allowance: "2000",
    hiredAt: "2023-01-15",
  },
  "maria.santos@payroll.com": {
    employeeNo: "EMP-002",
    department: "Administrative",
    position: "Dept. Head",
    groupName: "Regular",
    employmentType: "full_time",
    basicSalary: "28000",
    allowance: "1500",
    hiredAt: "2023-03-01",
  },
}

async function seed() {
  console.log("🌱 Starting database seed...")

  for (const user of seedUsers) {
    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      })

      if (result?.user) {
        console.log(`✅ Created user: ${user.email}`)
      }
    } catch (err: any) {
      const message = err?.body?.message ?? err?.message ?? ""
      if (/exist/i.test(message)) {
        console.log(`⚠️  User ${user.email} already exists, skipping...`)
      } else {
        console.error(`❌ Error creating ${user.email}:`, message || err)
      }
    }
  }

  // Promote admin and hr users and verify all seeded accounts.
  for (const user of seedUsers) {
    try {
      await db
        .update(users)
        .set({ role: user.role, emailVerified: true })
        .where(eq(users.email, user.email))
      console.log(`✅ Set ${user.email} → ${user.role}`)
    } catch (err) {
      console.error(`❌ Error updating ${user.email}:`, err)
    }
  }

  // Create employee records for seeded employees.
  for (const [email, record] of Object.entries(seedEmployees)) {
    try {
      const [u] = await db.select().from(users).where(eq(users.email, email))
      if (!u) {
        console.error(`❌ No user found for employee ${email}`)
        continue
      }

      const existing = await db
        .select()
        .from(employees)
        .where(eq(employees.userId, u.id))
      if (existing.length) {
        console.log(`⚠️  Employee record for ${email} already exists, skipping...`)
        continue
      }

      await db.insert(employees).values({ userId: u.id, ...record })
      console.log(`✅ Created employee record: ${record.employeeNo} (${email})`)
    } catch (err) {
      console.error(`❌ Error creating employee record for ${email}:`, err)
    }
  }

  // -------------------------------------------------------------------------
  // Attendance domain: settings, schedules, holidays, time logs, draft period
  // -------------------------------------------------------------------------

  // Default payroll configuration (singleton).
  await db
    .insert(payrollSettings)
    .values({
      id: "default",
      adminEmail: "admin@payroll.com",
      hrEmail: "hr@payroll.com",
    })
    .onConflictDoNothing()
  console.log("✅ Ensured default payroll settings")

  // Company profile (singleton).
  await db
    .insert(companyProfile)
    .values({
      id: "default",
      name: "Acme Corporation",
      address: "123 Ayala Ave, Makati City",
      email: "info@acme.com",
      phone: "+63 2 8888 0000",
      website: "https://acme.com",
    })
    .onConflictDoNothing()
  console.log("✅ Ensured company profile")

  // Manage Options: organizational classification lists.
  const designationNames = ["Dept. Head", "Supervisor", "Rider"]
  const groupNames = ["Regular", "Probationary", "Trainee", "Irregular", "On-Call"]
  const teamNames = ["Field", "Administrative", "Accounting"]
  for (const name of designationNames) {
    await db.insert(designations).values({ name }).onConflictDoNothing()
  }
  for (const name of groupNames) {
    await db.insert(groups).values({ name }).onConflictDoNothing()
  }
  for (const name of teamNames) {
    await db.insert(teams).values({ name }).onConflictDoNothing()
  }
  console.log("✅ Seeded manage options (designations, groups, teams)")

  // Work schedules.
  const scheduleDefs = [
    {
      name: "Day Shift",
      timeIn: "08:00",
      timeOut: "17:00",
      breakMinutes: 60,
      workDays: ["mon", "tue", "wed", "thu", "fri"],
      isNightShift: false,
    },
    {
      name: "Night Shift",
      timeIn: "22:00",
      timeOut: "06:00",
      breakMinutes: 60,
      workDays: ["mon", "tue", "wed", "thu", "fri"],
      isNightShift: true,
    },
  ]
  const scheduleIds: Record<string, string> = {}
  for (const s of scheduleDefs) {
    const existing = await db.select().from(schedules).where(eq(schedules.name, s.name))
    if (existing.length) {
      scheduleIds[s.name] = existing[0].id
    } else {
      const [created] = await db.insert(schedules).values(s).returning()
      scheduleIds[s.name] = created.id
      console.log(`✅ Created schedule: ${s.name}`)
    }
  }

  // Assign schedules to seeded employees.
  const empRows = await db.select().from(employees)
  const byNo = new Map(empRows.map((e) => [e.employeeNo, e]))
  const emp1 = byNo.get("EMP-001")
  const emp2 = byNo.get("EMP-002")
  if (emp1)
    await db
      .update(employees)
      .set({ scheduleId: scheduleIds["Day Shift"] })
      .where(eq(employees.id, emp1.id))
  if (emp2)
    await db
      .update(employees)
      .set({ scheduleId: scheduleIds["Night Shift"] })
      .where(eq(employees.id, emp2.id))
  console.log("✅ Assigned schedules to employees")

  // Holidays around the demo period (June 2026).
  const holidayDefs = [
    { name: "Company Foundation Day", date: "2026-06-05", type: "special_non_working" as const },
    { name: "Independence Day", date: "2026-06-12", type: "regular" as const },
  ]
  for (const h of holidayDefs) {
    await db.insert(holidays).values(h).onConflictDoNothing()
  }
  console.log("✅ Seeded holidays")

  // Sample time logs for the 1st-half-of-June 2026 cut-off.
  const pad = (n: number) => String(n).padStart(2, "0")
  const YEAR = 2026
  const MONTH = 5 // June (0-indexed)

  const at = (day: number, h: number, m: number, nextDay = false) =>
    new Date(YEAR, MONTH, day + (nextDay ? 1 : 0), h, m)

  // Day-shift punch builder: AM 08:00–12:00, PM 13:00–17:00.
  async function addDayShiftLog(
    employeeId: string,
    day: number,
    opts: { amInMin?: number } = {},
  ) {
    const logDate = `${YEAR}-${pad(MONTH + 1)}-${pad(day)}`
    await db
      .insert(timeLogs)
      .values({
        employeeId,
        logDate,
        amIn: at(day, 8, opts.amInMin ?? 0),
        amOut: at(day, 12, 0),
        pmIn: at(day, 13, 0),
        pmOut: at(day, 17, 0),
        source: "manual",
      })
      .onConflictDoNothing()
  }

  // Night-shift punch builder: single span 22:00 → 06:00 (next day).
  async function addNightShiftLog(employeeId: string, day: number) {
    const logDate = `${YEAR}-${pad(MONTH + 1)}-${pad(day)}`
    await db
      .insert(timeLogs)
      .values({
        employeeId,
        logDate,
        amIn: at(day, 22, 0),
        pmOut: at(day, 6, 0, true),
        source: "manual",
      })
      .onConflictDoNothing()
  }

  for (let d = 1; d <= 12; d++) {
    const dow = new Date(YEAR, MONTH, d).getDay()
    if (dow === 0 || dow === 6) continue // weekend

    // Day-shift employee — works incl. the special holiday (Jun 5),
    // off on the regular holiday (Jun 12, still paid), with one late day.
    if (emp1 && d !== 12) {
      await addDayShiftLog(emp1.id, d, {
        amInMin: d === 3 ? 45 : 0, // late on the 3rd
      })
    }

    // Night-shift employee — 10pm to 6am, generating night differential.
    if (emp2 && d !== 5 && d !== 12) {
      await addNightShiftLog(emp2.id, d)
    }
  }
  console.log("✅ Seeded sample time logs")

  // A draft payroll period ready to process for the demo.
  const existingPeriod = await db
    .select()
    .from(payrollPeriods)
    .where(eq(payrollPeriods.label, "June 2026 (1st Half)"))
  if (!existingPeriod.length) {
    await db.insert(payrollPeriods).values({
      label: "June 2026 (1st Half)",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-15",
      status: "draft",
    })
    console.log("✅ Created draft payroll period: June 2026 (1st Half)")
  }

  // -------------------------------------------------------------------------
  // Leaves & loans (Phase B): credits, a pending request, and a sample loan
  // -------------------------------------------------------------------------

  // Opening leave-credit balances for both seeded employees.
  const creditDefs = [
    { type: "vacation" as const, balance: "5" },
    { type: "sick" as const, balance: "5" },
    { type: "emergency" as const, balance: "3" },
  ]
  for (const emp of [emp1, emp2]) {
    if (!emp) continue
    for (const c of creditDefs) {
      await db
        .insert(leaveCredits)
        .values({ employeeId: emp.id, type: c.type, balance: c.balance })
        .onConflictDoNothing()
    }
  }
  console.log("✅ Seeded leave credits")

  // A pending vacation request on Mon Jun 15 (a scheduled day with no time log):
  // approving it live then re-processing payroll demonstrates paid-leave pay.
  if (emp1) {
    const existingLeave = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.employeeId, emp1.id))
    if (!existingLeave.length) {
      await db.insert(leaveRequests).values({
        employeeId: emp1.id,
        type: "vacation",
        dateFrom: "2026-06-15",
        dateTo: "2026-06-15",
        days: "1",
        reason: "Family matter",
      })
      console.log("✅ Created sample pending leave request (EMP-001)")
    }
  }

  // A sample active loan so processed payslips show amortization deductions.
  if (emp1) {
    const existingLoan = await db
      .select()
      .from(loans)
      .where(eq(loans.employeeId, emp1.id))
    if (!existingLoan.length) {
      await db.insert(loans).values({
        employeeId: emp1.id,
        type: "sss",
        principal: "12000",
        balance: "12000",
        amortization: "1000",
        startDate: "2026-06-01",
      })
      console.log("✅ Created sample loan (EMP-001 SSS, ₱1,000/cutoff)")
    }
  }

  console.log("\n📋 Seeded Users Credentials:\n")
  console.log("┌─────────────────────────────────────────────────────┐")
  console.log("│ Email                      │ Password       │ Role   │")
  console.log("├─────────────────────────────────────────────────────┤")
  for (const user of seedUsers) {
    const emailPad = user.email.padEnd(26)
    const passPad = user.password.padEnd(14)
    const rolePad = user.role.padEnd(6)
    console.log(`│ ${emailPad} │ ${passPad} │ ${rolePad} │`)
  }
  console.log("└─────────────────────────────────────────────────────┘\n")

  console.log("✨ Seed complete!")
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
