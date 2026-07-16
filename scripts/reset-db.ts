import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

// Drop order respects foreign keys (children before parents).
const TABLES = [
  "company_profile",
  "user_document",
  "user_profile",
  "team",
  '"group"',
  "designation",
  "loan",
  "leave_request",
  "leave_credit",
  "payroll_settings",
  "absence",
  "feedback",
  "payslip",
  "payroll_period",
  "employee",
  "verification",
  "session",
  "account",
  '"user"',
]

const ENUMS = [
  "tax_frequency",
  "loan_status",
  "loan_type",
  "leave_status",
  "leave_type",
  "payslip_status",
  "payroll_status",
  "employment_type",
  "user_role",
]

async function resetDatabase() {
  console.log("🔄 Resetting database...")

  try {
    for (const t of TABLES) {
      await db.execute(sql.raw(`DROP TABLE IF EXISTS ${t} CASCADE;`))
    }
    for (const e of ENUMS) {
      await db.execute(sql.raw(`DROP TYPE IF EXISTS ${e} CASCADE;`))
    }

    console.log("✅ All tables and enums dropped")
    console.log("✨ Database reset complete!")
    console.log("\nNext step: Run 'npm run db:migrate' then 'npm run db:seed'")
  } catch (error) {
    console.error("❌ Error resetting database:", error)
    process.exit(1)
  }
}

resetDatabase().catch(console.error)
