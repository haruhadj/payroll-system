import { db } from "@/lib/db"
import { users, employees } from "@/lib/db/schema"
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
    employmentType: "full_time" | "part_time" | "contractual"
    basicSalary: string
    allowance: string
    hiredAt: string
  }
> = {
  "juan.delacruz@payroll.com": {
    employeeNo: "EMP-001",
    department: "Finance",
    position: "Accountant",
    employmentType: "full_time",
    basicSalary: "30000",
    allowance: "2000",
    hiredAt: "2023-01-15",
  },
  "maria.santos@payroll.com": {
    employeeNo: "EMP-002",
    department: "Human Resources",
    position: "HR Associate",
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
