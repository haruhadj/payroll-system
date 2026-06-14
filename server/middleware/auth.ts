import { auth } from "@/lib/auth/server"
import type { Context, Next } from "hono"
import type { HonoVariables } from "@/server/types"

export async function authMiddleware(
  c: Context<{ Variables: HonoVariables }>,
  next: Next,
) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401)
  }
  c.set("user", session.user as HonoVariables["user"])
  c.set("session", session.session as HonoVariables["session"])
  await next()
}
