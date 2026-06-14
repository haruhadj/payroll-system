export type HonoVariables = {
  user: {
    id: string
    email: string
    name: string
    role: "admin" | "hr" | "employee"
  }
  session: {
    id: string
    token: string
    expiresAt: Date
  }
}
