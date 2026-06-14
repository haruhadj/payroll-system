This is a solid stack — let me map out a comprehensive architecture plan for your capstone.Click any box to dive deeper into that specific part. Here's the full plan breakdown:

---

**Core modules to build**

Your system naturally splits into these feature areas:

1. **Auth system** — email/password login, forgot password via Resend, Google OAuth, role-based access (Admin, HR, Employee)
2. **Employee management** — CRUD for employee profiles, departments, positions
3. **Payroll processing** — salary computation, allowances, deductions (SSS, PhilHealth, Pag-IBIG since you're PH-based), payslip generation
4. **Payroll history** — view past payslips, filter by period
5. **User feedback module** — the key differentiator for your capstone; employees rate/comment on the payroll process or system
6. **Admin dashboard** — overview of payroll runs, feedback summaries, employee count

---

**Suggested database tables**

- `users` + `sessions` + `accounts` — managed by Better Auth
- `employees` — profile, department, position, salary grade
- `payroll_periods` — cutoff dates per run
- `payslips` — computed pay per employee per period
- `deductions` — SSS, PhilHealth, Pag-IBIG, loans
- `feedback` — linked to employee + payroll period, rating + comment

---

**Project structure (monorepo-style)**

```
/app                  → Next.js pages + RSC
/app/api/[[...route]] → Hono catch-all handler
/lib/db               → Drizzle schema + client
/lib/auth             → Better Auth config
/components           → shared UI components
```

Hono mounts at `/api/[[...route]]` in Next.js, giving you both RSC and edge API in one Vercel deployment.

---

**Suggested build order**

1. Scaffold Next.js + Supabase + Drizzle + Better Auth
2. Auth flows (email, Google OAuth, forgot password + Resend)
3. Employee CRUD
4. Payroll computation logic + payslip generation
5. Feedback module
6. Admin dashboard + reports
7. UI polish + mobile responsiveness

Want me to go deeper on any layer — like the Drizzle schema, the Hono route structure, or the feedback system design?