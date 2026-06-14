import { db } from "@/lib/db"
import * as fs from "fs"
import * as path from "path"

async function runMigrations() {
  console.log("🔄 Running database migrations...")

  const migrationsDir = path.join(process.cwd(), "drizzle")
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()

  for (const file of files) {
    const filePath = path.join(migrationsDir, file)
    const fullSql = fs.readFileSync(filePath, "utf-8")

    // Split by Drizzle's statement breakpoint marker
    const statements = fullSql
      .split("--> statement-breakpoint\n")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    console.log(`\n📝 Running: ${file} (${statements.length} statements)`)

    for (const statement of statements) {
      try {
        await db.execute(statement as any)
      } catch (error: any) {
        // Ignore "already exists" errors
        const code = error.cause?.code || error.code
        if (
          error.message?.includes("already exists") ||
          code === "42P07" || // relation already exists
          code === "42710" || // type already exists
          code === "42P06" // schema already exists
        ) {
          // Already exists is OK
        } else {
          throw error
        }
      }
    }
    console.log(`✅ ${file} completed`)
  }

  console.log("\n✨ Migrations complete!")
}

runMigrations().catch(console.error)
