# Web-Based Payroll System — Project Context

## Project Summary

**Title:** Web-Based Payroll System with User Feedback  
**Deployment:** Frontend on Vercel, Backend on Vercel Edge  
**Database:** Supabase PostgreSQL  
**Target Users:** Employees, HR, Admin

This is a capstone project for a full-stack TypeScript payroll management system with integrated employee feedback on the payroll process itself.

## Key Features

### 1. Authentication & Authorization
- Email/password login with forgot password (via Resend API)
- Google OAuth social login
- Role-based access control (Admin, HR, Employee)
- Session management via Better Auth + PostgreSQL

### 2. Employee Management
- Create, read, update, delete employee records
- Track department, position, employment type, basic salary
- HR/Admin only

### 3. Payroll Processing
- Create payroll periods (bi-weekly/monthly cutoffs)
- Automatic payslip generation with PH-specific deductions:
  - SSS (Social Security System)
  - PhilHealth
  - Pag-IBIG
  - BIR withholding tax
- Payslip history and filtering

### 4. User Feedback (Capstone Differentiator)
- Employees rate payroll periods (1–5 stars)
- Optional comments
- Admin/HR view aggregate feedback statistics
- One feedback per employee per payroll period

### 5. Admin Dashboard
- Overview: total employees, pending payrolls, average feedback rating
- Payroll history and status tracking
- Feedback summary charts

## Architecture Layers

```
┌─────────────────────────────────────────┐
│  Frontend (Vercel)                      │
│  Next.js App Router + React Server      │
│  Components + TanStack Query            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  API Layer (Vercel Edge)                │
│  Hono HTTP Router                       │
│  Zod Request Validation                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Auth Layer                             │
│  Better Auth + Resend + Google OAuth    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Data Layer (Drizzle ORM)               │
│  Type-safe SQL queries                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Database (Supabase PostgreSQL)         │
│  All application state                  │
└─────────────────────────────────────────┘
```

## Key Design Decisions

### Hono RPC for Type Safety
- Routes are defined in `/server/routes/*.ts`
- Exported as `AppType` from `/server/index.ts`
- Frontend uses `hc<AppType>("/api")` client for end-to-end type safety
- No need to maintain separate API docs; types are enforced at compile time

### Better Auth with Drizzle
- All auth tables (users, sessions, accounts, verifications) live in PostgreSQL
- Drizzle manages schema, migrations, and queries
- No separate auth service; everything in one database

### Feedback as First-Class Feature
- Linked to both employee and payroll period (composite key)
- Enables per-period sentiment tracking
- Admin dashboard shows trend analysis

### PH-Specific Payroll Rules
- SSS, PhilHealth, Pag-IBIG calculations isolated in `/lib/payroll-calc.ts`
- Makes it easy to update deduction rates yearly
- Withholding tax follows current BIR tables

## Monorepo Structure

```
payroll-system/
├── app/                       # Next.js 16 App Router
│   ├── (auth)/               # public auth routes
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   └── forgot-password/
│   ├── (dashboard)/          # protected routes (layout with auth guard)
│   │   ├── payroll/
│   │   ├── employees/
│   │   ├── feedback/
│   │   └── settings/
│   ├── api/
│   │   ├── auth/[...all]/              # Better Auth handler
│   │   └── [[...route]]/route.ts       # Hono API catch-all (NEW)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── server/                   # Hono backend
│   ├── index.ts              # Main app instance & export
│   ├── routes/
│   │   ├── employees.ts
│   │   ├── payroll.ts
│   │   ├── payslips.ts
│   │   ├── feedback.ts
│   │   └── dashboard.ts
│   └── middleware/
│       ├── auth.ts
│       └── rbac.ts
├── lib/
│   ├── db/
│   │   ├── index.ts                    # Drizzle client
│   │   ├── schema.ts                   # Tables + auto-generated Zod schemas
│   │   └── migrations.ts               # Migration helpers (optional)
│   ├── auth/
│   │   ├── server.ts                   # Better Auth config
│   │   └── client.ts                   # Client-side hooks
│   ├── resend.ts                       # Email client
│   ├── payroll-calc.ts                 # PH tax/deduction logic
│   └── hooks/
│       ├── usePayslips.ts              # TanStack Query hooks
│       ├── useEmployees.ts
│       └── useFeedback.ts
├── components/
│   ├── ui/                  # shadcn/base components
│   ├── payroll/
│   ├── feedback/
│   └── employees/
├── drizzle/                 # Migrations (auto-generated by Drizzle Kit)
├── .env.local               # Secrets
├── middleware.ts            # Next.js route protection
├── drizzle.config.ts        # Drizzle Kit config
└── tsconfig.json            # TypeScript config
```

## Development Workflow

### 1. Local Setup
```bash
# Clone and install
git clone ...
npm install

# Setup env
cp .env.example .env.local

# Generate Drizzle client (first time only)
npm run db:generate

# Run migrations against local database
npm run db:migrate
# Fill in: DATABASE_URL, auth keys, API keys

# Run migrations
npx drizzle-kit push

# Start dev server
npm run dev
```

### 2. Database Changes
```bash
# Edit schema in lib/db/schema.ts
# Then:
npx drizzle-kit generate    # generates migration SQL
npx drizzle-kit push        # applies to local Supabase
```

### 3. Adding a New Route
1. Create `/server/routes/newfeature.ts` with Hono router
2. Mount in `/server/index.ts` with `.route("/newfeature", newFeatureRouter)`
3. Import and use in frontend with TanStack Query
4. Types flow automatically via Hono RPC

### 4. Adding Auth to an Endpoint
1. Use `authMiddleware` to require session
2. Use `requireRole("admin")` etc. for role checks
3. Access user/session via `c.get("user")` and `c.get("session")`

## Naming Conventions

- **Database fields:** snake_case (`basic_salary`, `employee_id`)
- **TypeScript:** camelCase (`basicSalary`, `employeeId`)
- **Routes:** kebab-case (`/api/payroll-periods`, `/api/payslips`)
- **Components:** PascalCase (`PayslipCard`, `EmployeeForm`)
- **Hooks:** camelCase prefixed with `use` (`usePayslips`, `useFeedback`)
- **API responses:** Wrapped in `{ data, error }` or `{ success, ... }`

## Error Handling Patterns

- HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Server Error)
- Always return JSON: `{ error: "message" }` or `{ success: true, data: ... }`
- Client-side: use TanStack Query's `isError`, `error.message` for display

## Performance Notes

- Vercel Edge runtime for API routes (faster cold starts, no warm-up)
- TanStack Query caching reduces unnecessary API calls
- Drizzle ORM generates optimized SQL (no N+1 queries)
- PostgreSQL indexes on foreign keys and frequently-filtered columns

## Testing Strategy (Optional for Capstone)

- Unit tests for payroll calculations (`lib/payroll-calc.ts`)
- E2E tests for auth flows (login, forgot password, Google OAuth)
- Integration tests for feedback submission

## Deployment Checklist

- [ ] Environment variables set in Vercel project
- [ ] Database migrations applied to Supabase production
- [ ] Google OAuth redirect URIs updated
- [ ] Resend sender domain verified
- [ ] Custom domain (optional)
- [ ] SSL certificate (automatic on Vercel)

## Resources for Claude Code

When implementing features:
1. Reference `/DATABASE.md` for schema details
2. Reference `/API.md` for route structure
3. Reference `/CONVENTIONS.md` for code patterns
4. Reference `/PAYROLL.md` for deduction calculations
5. Reference `/AUTH.md` for auth setup specifics

All types flow automatically via Hono RPC—no manual type duplication needed.
