import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { resend } from "@/lib/resend"

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      account: schema.accounts,
      session: schema.sessions,
      verification: schema.verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      await resend.emails.send({
        from: "Payroll System <onboarding@resend.dev>",
        to: user.email,
        subject: "Reset your password",
        html: `
          <h2>Password Reset</h2>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <a href="${url}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin-top:8px;">
            Reset Password
          </a>
          <p style="margin-top:16px;color:#6b7280;">If you didn't request this, ignore this email.</p>
        `,
      })
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "employee",
      },
    },
  },

  accountLinking: {
    enabled: true,
    trustedProviders: ["google"],
  },
})
