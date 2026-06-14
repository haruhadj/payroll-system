# Getting Started – Setup Guide

## Prerequisites

- **Node.js:** 18.17+ (check with `node --version`)
- **npm:** 9+ (or use `yarn`, `pnpm`)
- **Git:** For version control
- **Supabase account:** Free tier available
- **Resend account:** For transactional emails
- **Google Cloud project:** For OAuth

## Step-by-Step Setup

### 1. Create Next.js Project

```bash
npx create-next-app@latest payroll-system --typescript --tailwind
cd payroll-system
```

Choose these options when prompted:
- ✓ TypeScript
- ✓ Tailwind CSS
- ✓ App Router (not Pages)
- ✓ src/ directory (optional but recommended)
- ✗ ESLint (optional)

### 2. Install Dependencies

```bash
# Core
npm install next react react-dom

# Database & ORM
npm install drizzle-orm @vercel/postgres
npm install -D drizzle-kit

# Authentication
npm install better-auth
npm install -D @types/better-auth

# HTTP routing
npm install hono

# Validation
npm install zod @hono/zod-validator

# Data fetching
npm install @tanstack/react-query

# Email
npm install resend

# Utilities
npm install clsx tailwind-merge

# Dev dependencies
npm install -D typescript @types/node @types/react @types/react-dom
```

### 3. Setup Supabase

**Option A: Cloud Supabase (recommended)**
1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Create new project
4. Note the connection string (Settings → Database → Connection String)
5. Choose "URI string" format

**Option B: Local Supabase (development)**
```bash
# Install Docker first, then:
npx supabase init
npx supabase start
```

### 4. Create Environment File

```bash
cp .env.example .env.local
```

Fill in `.env.local`:
```env
# Database (from Supabase)
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"

# Better Auth (generate: openssl rand -base64 32)
BETTER_AUTH_SECRET="your_secret_here"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email (Resend)
RESEND_API_KEY="re_xxxxx"

# OAuth (Google)
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxxxx"
```

### 5. Setup Drizzle

**Create config file:**
```bash
cat > drizzle.config.ts << 'EOF'
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
EOF
```

**Add scripts to package.json:**
```json
{
  "scripts": {
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

### 6. Create Project Structure

```bash
# Create directories
mkdir -p lib/{db,auth,hooks}
mkdir -p server/routes
mkdir -p server/middleware
mkdir -p components/{ui,payroll,feedback,employees}
mkdir -p app/api/auth

# Create placeholder files (we'll fill these with content)
touch lib/db/index.ts
touch lib/db/schema.ts
touch lib/auth/server.ts
touch lib/auth/client.ts
touch lib/validators.ts
touch lib/payroll-calc.ts
touch lib/resend.ts
touch server/index.ts
touch server/middleware/auth.ts
touch server/routes/employees.ts
touch server/routes/payroll.ts
touch server/routes/feedback.ts
touch server/routes/dashboard.ts
touch middleware.ts
```

### 7. Setup Database Client

**Create `lib/db/index.ts`:**
```typescript
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client, { schema })
```

### 8. Copy Schema Files

Copy all content from `/DATABASE.md` into `lib/db/schema.ts`

### 9. Copy Auth Configuration

Copy auth setup from `/AUTH.md` into:
- `lib/auth/server.ts`
- `lib/auth/client.ts`
- Create `app/api/auth/[...all]/route.ts`

### 10. Initialize Database

```bash
npm run db:push
```

This creates all tables in your Supabase database.

### 11. Create Root Middleware

Create `middleware.ts` (from `/AUTH.md` section):
```typescript
// Copy middleware code from AUTH.md
```

### 12. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable Google+ API
4. Create OAuth credentials (Web application)
5. Add redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
6. Copy credentials to `.env.local`

### 13. Setup Resend

1. Go to [resend.com](https://resend.com)
2. Create account and API key
3. For testing: use `test@resend.dev`
4. For production: verify your domain
5. Add key to `.env.local`

### 14. Test Local Development

```bash
npm run dev
```

Visit `http://localhost:3000` and you should see the Next.js welcome page.

### 15. Create Landing Page

**Create `app/page.tsx`:**
```typescript
import { redirect } from "next/navigation"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <h1 className="text-5xl font-bold text-gray-900 mb-4">Payroll System</h1>
      <p className="text-xl text-gray-600 mb-8">Employee-friendly payroll with feedback</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
        >
          Register
        </Link>
      </div>
    </div>
  )
}
```

### 16. Create Login Page

**Create `app/(auth)/login/page.tsx`:**
```typescript
// Copy login component from AUTH.md
```

### 17. Create Register Page

**Create `app/(auth)/register/page.tsx`:**
```typescript
// Similar to login but calls signUp instead of signIn
```

### 18. Create Dashboard Layout

**Create `app/(dashboard)/layout.tsx`:**
```typescript
// Copy protected layout from AUTH.md
```

**Create `app/(dashboard)/page.tsx`:**
```typescript
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p>Welcome to your payroll dashboard</p>
    </div>
  )
}
```

### 19. Run First Tests

```bash
# Type check
npx tsc --noEmit

# Run dev server
npm run dev

# Visit http://localhost:3000
# Try signing up with an email
# Check Resend (or terminal) for forgot password email
```

### 20. Deploy to Vercel

**Connect repo:**
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

**Deploy on Vercel:**
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Set environment variables (copy from `.env.local`)
4. Deploy

---

## Project Structure After Setup

```
payroll-system/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── [feature]/
│   ├── api/
│   │   ├── auth/[...all]/route.ts
│   │   └── [[...route]]/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── payroll/
│   ├── feedback/
│   └── employees/
├── lib/
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── auth/
│   │   ├── server.ts
│   │   └── client.ts
│   ├── hooks/
│   ├── validators.ts
│   ├── payroll-calc.ts
│   └── resend.ts
├── server/
│   ├── index.ts
│   ├── routes/
│   │   ├── employees.ts
│   │   ├── payroll.ts
│   │   ├── feedback.ts
│   │   └── dashboard.ts
│   └── middleware/
│       ├── auth.ts
│       └── rbac.ts
├── drizzle/
│   └── migrations/
├── .env.local
├── .env.example
├── middleware.ts
├── drizzle.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## Quick Command Reference

```bash
# Development
npm run dev              # Start local dev server

# Database
npm run db:push        # Apply migrations
npm run db:generate    # Generate migration from schema changes
npm run db:studio      # Open Drizzle Studio

# Build & Deploy
npm run build           # Build for production
npm run start           # Run production server
npm run type-check      # TypeScript check

# Testing (if added)
npm run test           # Run tests
npm run test:watch     # Watch mode
```

---

## Environment Variables Checklist

- [ ] `DATABASE_URL` — Supabase connection string
- [ ] `BETTER_AUTH_SECRET` — Generated random secret
- [ ] `NEXT_PUBLIC_APP_URL` — Your app URL (include protocol)
- [ ] `RESEND_API_KEY` — Resend email API key
- [ ] `GOOGLE_CLIENT_ID` — Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` — Google OAuth secret

---

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED
```
**Solution:** Check `DATABASE_URL` is correct. Verify Supabase is running.

### Auth pages redirect loop
**Solution:** Check `middleware.ts` is in project root. Restart dev server.

### Google OAuth not working
**Solution:** Verify redirect URI matches exactly in Google Cloud. Try incognito mode.

### Resend email not received
**Solution:** Check API key. For dev, use `test@resend.dev`. Check spam folder.

### Type errors on build
**Solution:** Run `npm run type-check` to see all errors. Fix imports and types.

---

## Next Steps

1. **Implement Employee Management** — Follow `/API.md` and copy route code
2. **Setup Payroll Processing** — Use `/PAYROLL.md` for calculations
3. **Build Feedback System** — Reference `/API.md` and `/CONVENTIONS.md`
4. **Create Admin Dashboard** — Display summary stats and charts
5. **Test all flows** — Auth, payroll, feedback
6. **Deploy to Vercel** — Set env vars and push

---

## Development Tips

- Use `npm run db:studio` to inspect/edit database directly
- Check browser Network tab to see actual API calls
- Use `console.log` in RSC (shows in terminal, not browser)
- React DevTools extension helpful for debugging components
- Check `.env.local` is in `.gitignore` before committing

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle Docs](https://orm.drizzle.team)
- [Hono Docs](https://hono.dev)
- [Better Auth Docs](https://www.better-auth.com)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Supabase Docs](https://supabase.com/docs)

---

## Getting Help

- Check project README for common issues
- Review error messages in terminal and browser console
- Search GitHub issues in dependent libraries
- Reference context files (PROJECT.md, API.md, etc.) for implementation

Good luck with your capstone! 🚀

