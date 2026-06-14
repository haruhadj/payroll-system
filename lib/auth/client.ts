"use client"

import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

export const { signIn, signOut, signUp, useSession, resetPassword } = authClient

export async function forgetPassword(params: { email: string; redirectTo: string }) {
  const res = await fetch("/api/auth/forget-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: params.email, redirectURL: params.redirectTo }),
  })
  if (!res.ok) throw new Error("Failed to send reset email")
  return res.json()
}
