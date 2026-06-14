# Tech Stack Guide

## Frontend

### Next.js 16 (App Router)
**Role:** Server-side rendering, file-based routing, React Server Components  
**Key files:** `/app` directory  

**Patterns:**
- Use `(groupName)/` for route groups (e.g., `(auth)/`, `(dashboard)/`)
- RSC for data fetching in page.tsx, keep Client Components in `/components`
- `layout.tsx` handles page structure (auth guard, nav, footer)
- `loading.tsx` for skeleton UI during data fetch
- `error.tsx` for error boundaries
- Async params/searchParams in page/layout components (not in client components)

**Server Components (RSC):**
```typescript
// app/(dashboard)/payslips/page.tsx
import { PayslipsClient } from "@/components/payslips/payslips-client"
export default async function PayslipsPage() {
  // Fetch data here on server (no client-side waterfall)
  const data = await fetch("...")
  return <PayslipsClient initialData={data} />
}
```

**Client Components:**
```typescript
"use client"
import { useQuery } from "@tanstack/react-query"
// Hydration happens here; queries fetch fresh data
```

### React 19 + TypeScript
**Role:** Component library with strict type safety  

**Hooks used:**
- `useState`, `useEffect`, `useCallback` (standard)
- `useQuery`, `useMutation` (TanStack Query for async state)
- `useSession` (Better Auth for auth state)

### Tailwind CSS
**Role:** Utility-first styling  

**Config:** `tailwind.config.ts` extends with project colors/spacing  
**Usage:**
- Apply utilities directly: `className="px-4 py-2 bg-blue-600 rounded"`
- Responsive: `className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"`
- Dark mode: `dark:bg-slate-900`

### TanStack Query (React Query)
**Role:** Client-side async state, caching, refetching  

**Key concepts:**
- `useQuery()` for fetches (cached, stale-while-revalidate)
- `useMutation()` for POST/PUT/DELETE (optimistic updates)
- Query invalidation on mutation success

**Example:**
```typescript
const { data: payslips, isLoading } = useQuery({
  queryKey: ["payslips"],
  queryFn: () => client.payslips.$get()
})

const { mutate: submitFeedback } = useMutation({
  mutationFn: (data) => client.feedback.$post({ json: data }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["feedback"] })
  }
})
```

## Backend

### Hono (via App Router)
**Role:** Ultra-lightweight HTTP router, edge-runtime compatible  

**Key files:** `/server/index.ts`, `/server/routes/*.ts`, `/app/api/[[...route]]/route.ts`  
**Deployment:** Vercel Edge runtime (no Node.js needed)

**App Router Integration:**
```typescript
// app/api/[[...route]]/route.ts
import { handle } from 'hono/vercel'
import { app } from '@/server'

export const runtime = 'nodejs' // or 'edge' for Vercel Edge Functions

export const { GET, POST, PUT, DELETE, PATCH } = handle(app)
```

**Route Patterns:**
```typescript
// server/index.ts or server/routes/*.ts
export const router = new Hono()
  .get("/", middleware1, middleware2, async (c) => {
    return c.json({ data: "..." })
  })
  .post("/", zValidator("json", schema), async (c) => {
    const body = c.req.valid("json")
    // Process and respond
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id")
    // Delete logic
  })
```

**RPC Export:**
```typescript
// server/index.ts
export type AppType = typeof app
// Frontend imports and gets full type safety
import { hc } from 'hono/client'
const client = hc<AppType>('http://localhost:3000/api')
```

### Zod + Drizzle Integration
**Role:** Runtime schema validation with database schema auto-generation  

**Location:** Validation schemas generated from Drizzle tables or in `/lib/validators.ts`  

**Drizzle Built-in Zod Validation:**
```typescript
// lib/db/schema.ts
import { createSelectSchema, createInsertSchema } from 'drizzle-orm/zod'

export const selectEmployeeSchema = createSelectSchema(employees)
export const insertEmployeeSchema = createInsertSchema(employees)
  .omit({ id: true, createdAt: true }) // Remove auto-generated fields
```

**Usage in Routes:**
```typescript
import { insertEmployeeSchema } from '@/lib/db/schema'

router.post("/", zValidator("json", insertEmployeeSchema), async (c) => {
  const validated = c.req.valid("json") // typed as inferred from schema
  // Insert into database...
  const result = await db.insert(employees).values(validated)
  return c.json(result)
})
```

## Database

### PostgreSQL (via Supabase)
**Role:** Relational data storage, transactions, constraints  

**Key tables:**
- `user`, `account`, `session`, `verification` — Auth (Better Auth)
- `employee` — Employee profiles
- `payroll_period` — Payroll cutoff periods
- `payslip` — Generated pay records
- `feedback` — Employee feedback

**Connection:** via Supabase pooled connection string in `DATABASE_URL`

### Drizzle ORM + Built-in Zod
**Role:** TypeScript-first ORM for type-safe queries with automatic Zod schema generation  

**Key files:**
- `/lib/db/index.ts` — Drizzle client instance
- `/lib/db/schema.ts` — All table definitions + auto-generated Zod schemas

**Schema syntax with Zod validation:**
```typescript
import { createSelectSchema, createInsertSchema } from 'drizzle-orm/zod'

export const employees = pgTable("employee", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull(),
  // ... more fields
})

// Auto-generate Zod schemas from table definition
export const selectEmployeeSchema = createSelectSchema(employees)
export const insertEmployeeSchema = createInsertSchema(employees)
  .omit({ id: true, createdAt: true }) // Remove auto-generated fields
export const updateEmployeeSchema = insertEmployeeSchema.partial() // For PATCH
```

**Query syntax:**
```typescript
// SELECT
const allEmps = await db.select().from(employees)

// WHERE
const emp = await db.select().from(employees)
  .where(eq(employees.id, "uuid-here"))

// JOIN + Relations
const eachWithFeedback = await db.query.employees.findMany({
  with: { feedbacks: true }
})

// INSERT with Zod validation
const { insertEmployeeSchema } = require('@/lib/db/schema')
const validated = insertEmployeeSchema.parse(data)
const [newEmp] = await db.insert(employees).values(validated).returning()

// UPDATE
const [updated] = await db.update(employees)
  .set({ basicSalary: 50000 })
  .where(eq(employees.id, id))
  .returning()

// Aggregates
const stats = await db.select({
  count: count(payslips.id),
  avgNet: avg(payslips.netPay)
}).from(payslips)
```

### Drizzle Kit
**Role:** Schema migrations and push-to-db  

**Command reference:**
```bash
npx drizzle-kit generate      # Generate migration SQL from schema changes
npx drizzle-kit push          # Apply all migrations to connected DB
npx drizzle-kit migrate       # For production deploys
npx drizzle-kit studio       # Local UI for DB inspection
```

**Config:** `drizzle.config.ts` at project root

## Authentication

### Better Auth
**Role:** Production-ready auth with email/password, OAuth, sessions  

**Key files:**
- `/lib/auth/server.ts` — Backend config (Drizzle adapter, email provider)
- `/lib/auth/client.ts` — Client-side hooks (`useSession`, `signIn`, etc.)

**Session flow:**
1. User logs in via `/api/auth/[...all]` handler (Next.js)
2. Better Auth sets secure cookie + creates session in DB
3. Frontend calls `useSession()` hook to read cookie
4. Backend middleware checks cookie on protected routes

**Email integration (Resend):**
- Forgot password emails sent via Resend API
- Template: `/lib/auth/server.ts` has `sendResetPassword` callback
- Email domain must be verified in Resend dashboard

**Google OAuth:**
- Credentials from Google Cloud Console
- Redirect URI: `https://yourdomain.com/api/auth/callback/google`
- OAuth flow handled entirely by Better Auth

### Resend
**Role:** Transactional email API  

**Usage:**
```typescript
import { resend } from "@/lib/resend"

await resend.emails.send({
  from: "Payroll System <no-reply@yourdomain.com>",
  to: user.email,
  subject: "Reset Password",
  html: `<a href="${resetUrl}">Click here to reset</a>`
})
```

## Full Stack Type Safety

### Hono RPC Pattern
**Frontend (client-side):**
```typescript
import { hc } from "hono/client"
import type { AppType } from "@/server"

const client = hc<AppType>("/api")

// Every method is type-checked at compile time
await client.employees.$get()          // returns { data: Employee[] }
await client.payslips.$post({ json: payload })  // payload validated
```

**Backend:**
```typescript
// /server/routes/employees.ts
export const employeesRouter = new Hono()
  .get("/", async (c) => {
    const emps = await db.select().from(employees)
    return c.json(emps)  // inferred as Employee[]
  })
```

**Benefits:**
- No manual API documentation needed
- Compile-time error checking
- Autocomplete in IDE
- Refactoring is safe (rename field → all usages update)

## Deployment Targets

### Frontend & Backend: Vercel
**Frontend:** Static exports + Incremental Static Regeneration (ISR)  
**Backend:** Edge Functions (Node.js runtime disabled)  

**Environment variables:**
```
PUBLIC_:   exposed to frontend browser
PRIVATE_: server-only
```

### Database: Supabase
**PostgreSQL 15+**  
**Connection pooling:** Via PgBouncer  
**Backups:** Automatic daily retention

## Package Management

### npm (vs yarn/pnpm)
All dependencies listed in `package.json`  

**Key dev dependencies:**
- `typescript` — Language
- `@types/node` — Node.js types
- `drizzle-kit` — Schema migrations
- `drizzle-orm` — ORM runtime
- `zod` — Validation
- `@tanstack/react-query` — Async state
- `tailwindcss` — Styling
- `better-auth` — Auth
- `hono` — Backend router
- `resend` — Email
- `next` — Framework

**Running scripts:**
```bash
npm run dev      # Local dev (Next.js + Hono)
npm run build    # Production build
npm run start    # Production server
npm run type-check  # TypeScript check
```

## Summary: Data Flow

```
User types email/password
         ↓
Browser sends POST /api/auth/signin
         ↓
Better Auth handler validates, hashes password, creates session
         ↓
Session stored in PostgreSQL (via Drizzle)
         ↓
Secure cookie set in browser
         ↓
Frontend calls useSession() hook, reads cookie, shows authenticated UI
         ↓
User navigates to /dashboard
         ↓
middleware.ts checks cookie, allows access
         ↓
Page.tsx (RSC) calls API endpoint with session cookie
         ↓
Hono route verifies session via authMiddleware, queries DB, returns data
         ↓
TanStack Query caches result in browser
         ↓
Page renders with data
```

All types flow without manual effort—just use the types and trust TypeScript.
