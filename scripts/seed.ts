import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
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

async function seed() {
  console.log("🌱 Starting database seed...")

  const createdUsers = []

  for (const user of seedUsers) {
    try {
      const { data, error } = await auth.api.signUpEmail({
        body: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      })

      if (error) {
        if (error.message?.includes("already exists")) {
          console.log(`⚠️  User ${user.email} already exists, skipping...`)
        } else {
          console.error(`❌ Error creating ${user.email}:`, error.message)
        }
        continue
      }

      if (data?.user) {
        createdUsers.push(data.user)
        console.log(`✅ Created user: ${user.email}`)
      }
    } catch (err) {
      console.error(`❌ Exception creating ${user.email}:`, err)
    }
  }

  // Promote admin and hr users
  for (const user of seedUsers) {
    if (user.role !== "employee") {
      try {
        await db
          .update(users)
          .set({ role: user.role })
          .where(eq(users.email, user.email))
        console.log(`✅ Promoted ${user.email} to ${user.role}`)
      } catch (err) {
        console.error(`❌ Error promoting ${user.email}:`, err)
      }
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

seed().catch(console.error)
