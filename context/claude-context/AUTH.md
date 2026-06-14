# Authentication Setup Guide

## Overview

Authentication uses **Better Auth** as the core provider, integrated with:
- **Email/Password** auth with forgot password via **Resend API**
- **Google OAuth** for social login
- **PostgreSQL** (Supabase) for session & account storage
- **Secure cookies** for session persistence

## Better Auth Configuration

### Server Setup (`lib/auth/server.ts`)

```typescript
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { resend } from "@/lib/resend"

export const auth = betterAuth({
  // Database adapter
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      account: schema.accounts,
      session: schema.sessions,
      verification: schema.verifications,
    },
  }),

  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      // Called when user clicks "Forgot Password"
      await resend.emails.send({
        from: "Payroll System <no-reply@yourdomain.com>",
        to: user.email,
        subject: "Reset your password",
        html: `
          <h2>Password Reset</h2>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <a href="${url}" style="background: #007bff; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
            Reset Password
          </a>
          <p>If you didn't request this, ignore this email.</p>
        `,
      })
    },
  },

  // Social OAuth providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7,      // 7 days
    updateAge: 60 * 60 * 24,          // Refresh every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,                 // Cache cookie for 5 minutes
    },
  },

  // Custom user fields
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "employee",
        // Admin must manually update this in dashboard
      },
    },
  },

  // Optional: custom callbacks
  hooks: {
    async onSuccessfulSignIn({ user, session }) {
      // Log sign-in event (optional)
      console.log(`User ${user.email} signed in`)
    },
  },
})
```

### Client Setup (`lib/auth/client.ts`)

```typescript
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL, // e.g., "http://localhost:3000"
})

// Export hooks for use in components
export const {
  signIn,
  signOut,
  signUp,
  useSession,
  forgetPassword,
  resetPassword,
  signInSocial,
} = authClient
```

### API Handler (`app/api/auth/[...all]/route.ts`)

```typescript
import { auth } from "@/lib/auth/server"
import { toNextJsHandler } from "better-auth/next-js"

// Better Auth handles all auth endpoints via dynamic route
export const { GET, POST } = toNextJsHandler(auth)
```

This single handler manages all auth endpoints:
- `/api/auth/sign-in`
- `/api/auth/sign-up`
- `/api/auth/sign-out`
- `/api/auth/session`
- `/api/auth/forget-password`
- `/api/auth/reset-password`
- `/api/auth/callback/google`

**Note:** Better Auth routes use the dynamic `[...all]` pattern and are separate from the Hono catch-all at `/app/api/[[...route]]/route.ts`. Route priority: specific routes (like `[...all]`) match before catch-all routes (`[[...route]]`).

---

## Setup Steps

### 1. Environment Variables

Create `.env.local` in project root:

```env
# Database
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]

# Better Auth secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your_random_secret_here

# App URL (for OAuth redirects and email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend Email API
RESEND_API_KEY=re_xxxxx

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
```

### 2. Install Dependencies

```bash
npm install better-auth resend
npm install --save-dev @types/better-auth
```

### 3. Generate Auth Secret

```bash
openssl rand -base64 32
```

Paste output into `BETTER_AUTH_SECRET` in `.env.local`.

### 4. Setup Google OAuth

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project (or use existing)
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials:
   - Type: Web application
   - Authorized JavaScript origins:
     - `http://localhost:3000` (local)
     - `https://yourdomain.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://yourdomain.com/api/auth/callback/google`
5. Copy Client ID & Secret into `.env.local`

### 5. Setup Resend

**Steps:**
1. Sign up at [resend.com](https://resend.com)
2. Create API key
3. Verify sender domain (e.g., `yourdomain.com`)
   - Add DNS records as shown in Resend dashboard
4. Copy API key to `RESEND_API_KEY`

**Email sender format:** `Your Name <no-reply@yourdomain.com>`
- Domain must be verified
- Local testing uses `test@resend.dev` (no verification needed)

### 6. Verify Database Tables

Better Auth creates these tables automatically on first request (if they don't exist):

```sql
-- Created by Better Auth + Drizzle schema
CREATE TABLE "user" (...);
CREATE TABLE "account" (...);
CREATE TABLE "session" (...);
CREATE TABLE "verification" (...);
```

Run migrations:
```bash
npx drizzle-kit push
```

---

## Usage in Components

### Login Page

```typescript
"use client"
import { signIn } from "@/lib/auth/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await signIn.email({
        email,
        password,
        rememberMe: true,
      })

      if (res.error) {
        setError(res.error.message)
      } else {
        // Success—user is authenticated
        router.push("/dashboard")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    await signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    })
  }

  return (
    <form onSubmit={handleSignIn} className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Payroll Login</h1>

      {error && <div className="bg-red-100 text-red-800 p-3 rounded">{error}</div>}

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded p-2"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border rounded p-2"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <hr className="my-4" />

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full border border-gray-300 py-2 rounded hover:bg-gray-50"
      >
        Sign in with Google
      </button>

      <p className="text-sm text-center">
        Don't have an account?{" "}
        <a href="/register" className="text-blue-600 hover:underline">
          Sign up
        </a>
      </p>

      <p className="text-sm text-center">
        <a href="/forgot-password" className="text-blue-600 hover:underline">
          Forgot password?
        </a>
      </p>
    </form>
  )
}
```

### Forgot Password Page

```typescript
"use client"
import { forgetPassword } from "@/lib/auth/client"
import { useState } from "react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await forgetPassword({
        email,
        redirectURL: `${window.location.origin}/reset-password`,
      })

      // Better Auth sends email with reset link
      setSent(true)
    } catch (err) {
      setError("Failed to send reset email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p>We sent a password reset link to <strong>{email}</strong></p>
        <p className="text-sm text-gray-600">Link expires in 1 hour.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Forgot Password</h1>

      {error && <div className="bg-red-100 text-red-800 p-3 rounded">{error}</div>}

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded p-2"
          placeholder="you@example.com"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send Reset Link"}
      </button>

      <p className="text-sm text-center">
        <a href="/login" className="text-blue-600 hover:underline">
          Back to login
        </a>
      </p>
    </form>
  )
}
```

### Reset Password Page

```typescript
"use client"
import { resetPassword } from "@/lib/auth/client"
import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (!token) {
    return <div className="text-red-600">Invalid reset link. Please try again.</div>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    setError("")

    try {
      await resetPassword({
        token,
        newPassword: password,
      })

      // Success—user can now log in with new password
      router.push("/login?message=Password reset successfully. Please log in.")
    } catch (err) {
      setError("Failed to reset password. Link may have expired.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Reset Password</h1>

      {error && <div className="bg-red-100 text-red-800 p-3 rounded">{error}</div>}

      <div>
        <label className="block text-sm font-medium">New Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border rounded p-2"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full border rounded p-2"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  )
}
```

### Protected Dashboard Layout

```typescript
"use client"
import { useSession } from "@/lib/auth/client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  if (isPending) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!session) {
    return null // Will redirect to login
  }

  return (
    <div className="space-y-4">
      <header className="bg-slate-100 p-4 rounded">
        <p>Welcome, <strong>{session.user.name}</strong> ({session.user.role})</p>
      </header>

      <main>{children}</main>
    </div>
  )
}
```

### Next.js Middleware (Route Protection)

```typescript
// middleware.ts (at project root)
import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

export async function middleware(request: NextRequest) {
  const session = getSessionCookie(request)
  const { pathname } = request.nextUrl

  // Public paths (no auth required)
  const publicPaths = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ]
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  // Redirect unauthenticated users to login
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect authenticated users away from auth pages
  if (session && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Apply middleware to all routes except API, statics, etc.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

---

## Role Management

### Default Behavior
- All new users signup with `role: "employee"`
- Admins must manually promote users to `role: "hr"` or `role: "admin"`

### Admin Promotion (Backend)

Create an admin-only endpoint to update roles:

```typescript
// server/routes/users.ts
router.patch("/users/:userId/role", requireRole("admin"), async (c) => {
  const { userId } = c.req.param()
  const { role } = c.req.valid("json")

  const [user] = await db.update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning()

  return c.json(user)
})
```

---

## Session Management

### Auto-Logout on Token Expiry
Better Auth handles this automatically:
- Default session lifespan: 7 days
- Tokens refresh every 24 hours (sliding window)
- Expired sessions deleted from DB periodically

### Manual Sign-Out

```typescript
import { signOut } from "@/lib/auth/client"

async function handleLogout() {
  await signOut()
  // User is logged out, cookie cleared, session deleted
  window.location.href = "/login"
}
```

---

## Testing Auth Locally

### Email/Password (No Domain Required)
1. Signup with any email
2. Forgot password links go to console in dev mode
3. Click reset link in browser directly

### Google OAuth (Local Development)
1. Use `http://localhost:3000` as origin in Google Cloud
2. Add `http://localhost:3000/api/auth/callback/google` as redirect URI
3. Test by clicking "Sign in with Google"

### Resend Email (Sandbox Mode)
For testing without verified domain:
- Use `test@resend.dev` as recipient in development
- Or use `magic@resend.dev` for OTP-style flows

---

## Production Checklist

- [ ] Domain verified in Resend
- [ ] Google OAuth redirect URIs updated to production domain
- [ ] `BETTER_AUTH_SECRET` set in Vercel environment
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Database backups enabled on Supabase
- [ ] Expired sessions cleanup job configured (optional)
- [ ] SSL certificate enabled (automatic on Vercel)
- [ ] Email templates reviewed and branded

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid token" on reset | Token expired (1-hour limit). Send new reset email. |
| Google OAuth not working | Check redirect URI matches exactly. Clear browser cache. |
| Reset email not received | Check Resend API key. Verify sender domain. Check spam folder. |
| Session cookie not set | Check `BETTER_AUTH_SECRET` is set. Ensure HTTPS in production. |
| User can't see feedback | User must have `employee` record created by HR. |

