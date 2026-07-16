import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { db } from "@/lib/db"
import {
  users,
  employees,
  userProfiles,
  userDocuments,
  updateUserProfileSchema,
  insertUserDocumentSchema,
} from "@/lib/db/schema"
import { auth } from "@/lib/auth/server"
import { authMiddleware } from "@/server/middleware/auth"
import type { HonoVariables } from "@/server/types"
import { eq, desc } from "drizzle-orm"
import { z } from "zod"

const router = new Hono<{ Variables: HonoVariables }>()
  .use(authMiddleware)

  // Composite profile bundle for the signed-in user.
  .get("/", async (c) => {
    const sessionUser = c.get("user")

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, sessionUser.id))

    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, sessionUser.id),
    })

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, sessionUser.id),
    })

    const documents = await db.query.userDocuments.findMany({
      where: eq(userDocuments.userId, sessionUser.id),
      orderBy: [desc(userDocuments.createdAt)],
    })

    return c.json({ user, employee: employee ?? null, profile: profile ?? null, documents })
  })

  // Upsert the signed-in user's profile.
  .patch("/", zValidator("json", updateUserProfileSchema), async (c) => {
    const user = c.get("user")
    const data = c.req.valid("json")
    const [row] = await db
      .insert(userProfiles)
      .values({ userId: user.id, ...data })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning()
    return c.json(row)
  })

  // Change the signed-in user's password.
  .post(
    "/password",
    zValidator(
      "json",
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "New password must be at least 8 characters"),
      }),
    ),
    async (c) => {
      const { currentPassword, newPassword } = c.req.valid("json")
      try {
        await auth.api.changePassword({
          body: { currentPassword, newPassword, revokeOtherSessions: false },
          headers: c.req.raw.headers,
        })
        return c.json({ success: true })
      } catch (e: any) {
        return c.json(
          { error: e?.body?.message ?? e?.message ?? "Failed to change password" },
          400,
        )
      }
    },
  )

  // ----- Document links (Files tab) -----------------------------------------

  .post("/documents", zValidator("json", insertUserDocumentSchema), async (c) => {
    const user = c.get("user")
    const data = c.req.valid("json")
    const [row] = await db
      .insert(userDocuments)
      .values({ userId: user.id, ...data })
      .returning()
    return c.json(row, 201)
  })

  .delete("/documents/:id", async (c) => {
    const user = c.get("user")
    const id = c.req.param("id")!
    const doc = await db.query.userDocuments.findFirst({
      where: eq(userDocuments.id, id),
    })
    if (!doc) return c.json({ error: "Not found" }, 404)
    if (doc.userId !== user.id) return c.json({ error: "Forbidden" }, 403)
    await db.delete(userDocuments).where(eq(userDocuments.id, id))
    return c.json({ success: true })
  })

export { router as profileRouter }
