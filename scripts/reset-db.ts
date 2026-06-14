import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

async function resetDatabase() {
  console.log("🔄 Resetting database...")

  try {
    // Drop all tables in cascade (order matters due to foreign keys)
    await db.execute(sql`DROP TABLE IF EXISTS verification CASCADE;`)
    await db.execute(sql`DROP TABLE IF EXISTS session CASCADE;`)
    await db.execute(sql`DROP TABLE IF EXISTS account CASCADE;`)
    await db.execute(sql`DROP TABLE IF EXISTS employee CASCADE;`)
    await db.execute(sql`DROP TABLE IF EXISTS "user" CASCADE;`)

    // Drop enum type
    await db.execute(sql`DROP TYPE IF EXISTS user_role CASCADE;`)

    console.log("✅ All tables and enums dropped")
    console.log("✨ Database reset complete!")
    console.log("\nNext step: Run 'npm run db:seed' to repopulate with test data")
  } catch (error) {
    console.error("❌ Error resetting database:", error)
    process.exit(1)
  }
}

resetDatabase().catch(console.error)
