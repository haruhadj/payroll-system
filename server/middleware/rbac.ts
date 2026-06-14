import type { Context, Next } from "hono"
import type { HonoVariables } from "@/server/types"

type Role = "admin" | "hr" | "employee"

export function requireRole(...roles: Role[]) {
  return async (c: Context<{ Variables: HonoVariables }>, next: Next) => {
    const user = c.get("user")
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403)
    }
    await next()
  }
}
