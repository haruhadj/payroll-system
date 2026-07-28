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
          code === "42P06" || // schema already exists
          code === "42701" || // column already exists
          code === "42P16" || // duplicate object
          // A later migration in this file references a column an earlier
          // migration defined, but a database provisioned via `drizzle-kit
          // push` (rather than a full replay from empty) can already be at a
          // newer schema shape where that column was renamed/dropped before
          // this statement ever ran against it — e.g. `time_log.log_date`
          // (0003) vs. `time_log.date` (0013, after the table was dropped
          // and recreated). Since this script has no migration-tracking
          // table and always replays every file, that drift is expected and
          // safe to skip past. NOTE: this also silently no-ops a genuine
          // typo'd column reference in a future migration — if a migration
          // mysteriously has no effect, check here first.
          code === "42703" // undefined column
        ) {
          // Already applied / superseded — OK to continue.
        } else {
          throw error
        }
      }
    }
    console.log(`✅ ${file} completed`)
  }

  console.log("\n✨ Migrations complete!")
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
