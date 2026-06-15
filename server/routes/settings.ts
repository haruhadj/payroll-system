import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import { payrollSettings, companyProfile } from "@/lib/db/schema"
import {
  updatePayrollSettingsSchema,
  updateCompanyProfileSchema,
} from "@/lib/db/schema"
import { authMiddleware } from "@/server/middleware/auth"
import { requireRole } from "@/server/middleware/rbac"
import type { HonoVariables } from "@/server/types"
import { eq } from "drizzle-orm"

// Returns the singleton settings row, creating it with defaults if missing.
export async function getPayrollSettings() {
  const existing = await db.query.payrollSettings.findFirst({
    where: eq(payrollSettings.id, "default"),
  })
  if (existing) return existing
  const [created] = await db
    .insert(payrollSettings)
    .values({ id: "default" })
    .onConflictDoNothing()
    .returning()
  return (
    created ??
    (await db.query.payrollSettings.findFirst({
      where: eq(payrollSettings.id, "default"),
    }))!
  )
}

// Returns the singleton company-profile row, creating it if missing.
export async function getCompanyProfile() {
  const existing = await db.query.companyProfile.findFirst({
    where: eq(companyProfile.id, "default"),
  })
  if (existing) return existing
  const [created] = await db
    .insert(companyProfile)
    .values({ id: "default" })
    .onConflictDoNothing()
    .returning()
  return (
    created ??
    (await db.query.companyProfile.findFirst({
      where: eq(companyProfile.id, "default"),
    }))!
  )
}

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  .get("/payroll", async (c) => {
    const settings = await getPayrollSettings()
    return c.json(settings)
  })

  .patch(
    "/payroll",
    requireRole("admin"),
    zValidator("json", updatePayrollSettingsSchema),
    async (c) => {
      const data = c.req.valid("json")
      await getPayrollSettings() // ensure the row exists
      const [updated] = await db
        .update(payrollSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(payrollSettings.id, "default"))
        .returning()
      return c.json(updated)
    },
  )

  .get("/company", async (c) => {
    const profile = await getCompanyProfile()
    return c.json(profile)
  })

  .patch(
    "/company",
    requireRole("admin"),
    zValidator("json", updateCompanyProfileSchema),
    async (c) => {
      const data = c.req.valid("json")
      await getCompanyProfile() // ensure the row exists
      const [updated] = await db
        .update(companyProfile)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(companyProfile.id, "default"))
        .returning()
      return c.json(updated)
    },
  )

export { router as settingsRouter }
