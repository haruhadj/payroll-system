Let's go through all of them. I'll cover each area thoroughly.

---

## 1. Project file/folder structure---

## 2. Drizzle schema designAnd the actual Drizzle schema code (`lib/db/schema.ts`):---

## 3. Hono route structure---

## 4. Auth setup — Better Auth + Resend + Google OAuth---

## 5. Feedback system design---

That's the full picture. A few key things worth remembering as you build:

**Philippine-specific logic** — `lib/payroll-calc.ts` is where SSS, PhilHealth, Pag-IBIG brackets and BIR withholding tax tables go. These change yearly, so keeping them in one isolated file makes updates easy.

**Role flow** — a user gets `role: "employee"` by default when they sign up. An admin then manually links them to an `employee` record and can promote their role via a separate admin endpoint.

**Feedback as a capstone differentiator** — since this is what sets your thesis apart, consider adding: average rating displayed on the admin dashboard per payroll period, a simple bar chart of ratings distribution, and a constraint that employees can only submit one feedback per period (use a unique index on `(employee_id, period_id)` in the feedback table).

**Drizzle migration command** to run against Supabase: `npx drizzle-kit push` for development, or `npx drizzle-kit generate` + `npx drizzle-kit migrate` for production.

Want me to generate the PH payroll computation logic, the TanStack Query hooks, or the admin dashboard layout next?