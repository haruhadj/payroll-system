# Final Defense Guide

A plain-language guide to understanding and defending the Payroll System. Read this
end-to-end at least twice before the defense. It explains **what the system is**, **how
it works under the hood**, and gives you a **question bank with model answers** for the
panel.

> How to use this doc: Part 1–2 is your opening and framing. Part 3–6 is the technical
> understanding you must be able to explain in your own words. Part 7 is a worked
> payslip example — rehearse it out loud. Part 8 is the panelist Q&A bank. Part 9 is how
> to defend the system's limits without losing points.

---

## Part 1 — The 60-second pitch (memorize this)

> "Our system is a web-based payroll management system for a Philippine company. It
> automates the full payroll cycle: employees' attendance is recorded as time logs, and
> from those logs the system computes each employee's pay for a cutoff period —
> including overtime, night differential, holiday pay, and late deductions — then applies
> the mandatory government contributions (SSS, PhilHealth, Pag-IBIG) and BIR withholding
> tax to produce a payslip. It has role-based access for Admin, HR, and Employees, and
> employees can view their own payslips and submit feedback. It's built as a modern,
> type-safe full-stack TypeScript web application."

That single paragraph answers "What did you build?" — the most common opening question.

---

## Part 2 — Problem, objectives, and scope

**The problem.** Manual payroll (spreadsheets, hand calculation) is slow, error-prone,
and hard to audit — especially with Philippine-specific rules (SSS/PhilHealth/Pag-IBIG
brackets, TRAIN-law tax, holiday pay, night differential). Small and mid-sized companies
need an affordable, accurate, automated alternative.

**General objective.** To design and develop a web-based payroll management system that
automates attendance-based salary computation and Philippine statutory deductions.

**Specific objectives (typical phrasing — align with your actual paper).**
1. Record and manage employees, schedules, and attendance (time logs).
2. Automatically compute gross pay, deductions, and net pay per cutoff period.
3. Apply PH statutory contributions (SSS, PhilHealth, Pag-IBIG) and BIR withholding tax.
4. Enforce role-based access (Admin / HR / Employee) with secure authentication.
5. Let employees view their own payslips and submit feedback.

**Scope — what it does.** Employee management, work schedules, holidays, attendance/time
logs, leave requests, loans, overtime requests, payroll period processing, payslip
generation with a full earnings/deductions breakdown, dashboards and reports, and a
feedback module.

**Delimitations — what it does not do (state these confidently; see Part 9).** No payslip
PDF export, no automated payslip email on release, no full audit-trail/change history, no
BIR year-end forms (2316/alphalist), single company only. These are honest scope
boundaries, not failures.

---

## Part 3 — Architecture, in plain language

Think of the app in four layers. You should be able to draw this on a whiteboard.

```
[ Browser / UI ]  ──►  [ API layer ]  ──►  [ Business logic ]  ──►  [ Database ]
  Next.js + React      Hono routes         Payroll engine          PostgreSQL
  Tailwind CSS         Zod validation      (lib/payroll-calc.ts)   Drizzle ORM
  TanStack Query       Better Auth +
                       RBAC middleware
```

- **Frontend — Next.js (React) + Tailwind CSS.** Renders the pages (dashboard, employees,
  payroll, payslips, etc.). **TanStack Query** handles fetching/caching data from the API
  (the `lib/hooks/*` files, e.g. `usePayroll`, `usePayslips`).
- **API — Hono.** A lightweight, fast web router. Every feature has a sub-router in
  `server/routes/*` (employees, payroll, payslips, leaves, loans, …), all mounted under
  `/api` in `server/index.ts`.
- **Validation — Zod.** Every incoming request body is validated against a schema before
  it touches the database. Bad input is rejected with a `400` and clear field errors, so
  malformed data never reaches the logic layer.
- **Auth & access — Better Auth + RBAC middleware.** Better Auth manages login sessions.
  Two middlewares guard routes: `authMiddleware` (must be logged in, else `401`) and
  `requireRole(...)` (must have the right role, else `403`).
- **Database — PostgreSQL + Drizzle ORM.** Drizzle is a type-safe query builder; the
  schema lives in `lib/db/schema.ts`. Migrations (the `drizzle/*.sql` files) build the
  tables.

**Why this stack (if asked "why not PHP/Laravel/etc.?").** One language — TypeScript —
across the whole app, so types flow end-to-end from the database to the UI. That means
the compiler catches whole classes of bugs (a mismatched field, a wrong type) *before*
runtime, which matters a lot for payroll where a wrong number is a serious defect. It's
also modern, lightweight, and deployable to serverless/edge platforms.

---

## Part 4 — How the core flow works: from attendance to payslip

This is the heart of the system. Learn this sequence cold.

1. **Setup data exists:** employees (with a monthly `basicSalary`, `allowance`, and an
   assigned `schedule`), work schedules (time in/out, work days), holidays, and system
   `payrollSettings` (the rates and toggles).
2. **Attendance is recorded** as **time logs** — punches per day (`amIn`, `amOut`,
   `pmIn`, `pmOut`, and optional `otIn`/`otOut`).
3. **A payroll period** is created (e.g. "June 2026 (1st Half)", Jun 1–15) with status
   `draft`.
4. **Processing** (`PATCH /api/payroll/:id` → status `processed`) runs, for every active
   employee, two engine functions from `lib/payroll-calc.ts`:
   - **`aggregateAttendance(...)`** — walks each day in the period and turns raw punches
     + schedule + holiday calendar + approved leaves into **hour buckets**: regular days
     worked, OT hours, night-differential hours, holiday hours, late minutes, days
     absent, paid-leave days.
   - **`calculatePayrollFromAttendance(...)`** — turns those buckets into pesos: basic
     pay, OT pay, night-diff pay, holiday pay, minus late deduction = gross; then applies
     SSS/PhilHealth/Pag-IBIG/tax and loan amortization = **net pay**.
   - The result is inserted as a **payslip** row (status `pending`). Active loan balances
     are decremented by the amortization deducted — but **only when a new payslip is
     actually created**, so re-processing a period never double-charges a loan.
5. **Release** (status `released`) marks the period as finalized for employees to view.
6. **Employees** sign in and see **only their own** payslips (enforced server-side), and
   can submit **feedback** (rating 1–5 + comment) for the period.

**Key design decision to be able to defend:** attendance drives pay. A present day earns
a full day's basic pay; lateness is charged *only* through the late deduction (not by
also shaving worked hours) so an employee is never penalized twice for the same late
arrival. Overtime is **explicit** — it comes from the dedicated OT punch pair, not
automatically from "hours beyond 8", which prevents accidental/unapproved overtime.

---

## Part 5 — The computation engine explained simply

All of this is in `lib/payroll-calc.ts`. You do **not** need to recite code — you need to
explain the *logic* in plain words.

### Rates come from two places
- **Per employee:** `basicSalary` (monthly) and `allowance`.
- **System settings (`payrollSettings`):** multipliers and toggles — OT rate (default
  **1.25×**), night-differential rate (**0.10 / 10%**), regular-holiday rate (**2.00×**),
  special-holiday rate (**1.30×**), working days per month (**22**), work hours per day
  (**8**), late grace period, and on/off switches for each statutory deduction.

### The building-block rates
- **Daily rate** = monthly `basicSalary` ÷ `workingDaysPerMonth` (22).
- **Hourly rate** = daily rate ÷ `workHoursPerDay` (8).

### Earnings
- **Basic pay** = daily rate × regular days worked (+ paid-leave days valued at the daily
  rate).
- **Overtime pay** = OT hours × hourly rate × OT rate (1.25×).
- **Night-differential pay** = night hours × hourly rate × 0.10 (extra 10% for hours
  between 22:00 and 06:00).
- **Holiday pay** = holiday hours × hourly rate × the holiday multiplier (regular 2.00×,
  special 1.30×). An **unworked regular holiday is still paid** (counts as a day worked);
  an **unworked special non-working day is "no work, no pay."**
- **Late deduction** = late minutes × per-minute rate (defaults to hourly rate ÷ 60).
- **Gross pay** = basic + allowance + OT + night-diff + rest-day + holiday − late
  deduction.

### The Philippine statutory deductions (be ready to explain each)
These are computed on the **monthly basic salary** (standard PH practice), and each can
be toggled per employee and system-wide.
- **SSS** — a bracketed contribution table; the employee share is roughly 1.37%–1.91% of
  salary depending on the bracket, floored/capped (≈₱185–₱1,725).
- **PhilHealth** — **2.75%** of salary, floored/capped (₱250–₱2,750).
- **Pag-IBIG** — 1% below ₱10k, else 2%, capped at ₱200.
- **BIR withholding tax** — the **TRAIN-law** bracket table, applied to *taxable pay*
  (gross minus the three contributions above).

### Loans and 13th-month
- **Loan amortization** — a fixed per-cutoff amount deducted from net pay, capped at the
  outstanding balance; the balance is reduced and the loan is auto-marked `paid` when it
  hits zero.
- **13th-month** — an optional 1/12-of-basic accrual per cutoff, off by default (PH law
  requires it annually; the toggle lets you spread it).

### Net pay (the bottom line)
> **Net pay = Gross pay − (SSS + PhilHealth + Pag-IBIG + Withholding tax + Loans) +
> 13th-month accrual**

Everything is rounded to 2 decimals (centavos).

---

## Part 6 — Security & access control (panelists love this topic)

- **Authentication:** **Better Auth** with email + password. Sessions are stored in
  PostgreSQL; passwords are hashed by the auth library (never stored in plain text).
- **Two-gate authorization on every protected route:**
  1. `authMiddleware` — is there a valid session? If not → **401 Unauthorized**.
  2. `requireRole("admin", "hr", …)` — does the user's role allow this? If not → **403
     Forbidden**.
- **Roles:** `admin` (full control incl. user management), `hr` (payroll/employee
  operations), `employee` (self-service: own payslips + feedback only).
- **Data isolation:** an employee querying payslips only ever receives *their own* rows —
  this is enforced on the **server**, not hidden in the UI, so it can't be bypassed by
  crafting a request.
- **Input validation:** **Zod** validates every request body/params. Invalid input is
  rejected before it reaches business logic — no raw database errors leak to the client.

**One-liner if asked "is it secure?":** "Authentication and authorization are enforced
server-side on every request through two middleware gates, passwords are hashed, and all
input is schema-validated with Zod before it reaches the database."

---

## Part 7 — A worked payslip you can walk the panel through

Using the seeded employee **Juan dela Cruz (EMP-001)** for **June 2026 (1st Half),
Jun 1–15**. Monthly basic **₱30,000**, allowance **₱2,000**, Day Shift, an active SSS
loan (**₱1,000/cutoff**), one late day, and 2 hours of overtime.

> **CRITICAL:** Before the defense, run `bun run tsx --env-file=.env scripts/verify-payroll.ts`
> and read off the *actual* figures for your seeded data — memorize **those** exact
> centavo amounts. The numbers below show the **method** and are accurate to the model,
> but rounding order can shift a few centavos. Never quote a number to the panel you
> haven't confirmed against the running system.

**Step 1 — building blocks**
- Daily rate = 30,000 ÷ 22 = **₱1,363.64**
- Hourly rate = 1,363.64 ÷ 8 = **₱170.45**

**Step 2 — attendance buckets** (from the seeded logs)
- Regular days worked: **9** (worked weekdays + the unworked-but-paid regular holiday
  Jun 12)
- Overtime: **2 hours** (Jun 9)
- Special-holiday hours worked: **8** (Jun 5, worked)
- Late minutes: **45** (Jun 3)
- Absent: **1 day** (Jun 15 — *before* the leave is approved)

**Step 3 — earnings**
- Basic pay = 1,363.64 × 9 ≈ **₱12,272.73**
- OT pay = 2 × 170.45 × 1.25 ≈ **₱426.14**
- Holiday pay = 8 × 170.45 × 1.30 ≈ **₱1,772.73** (special holiday, worked)
- Late deduction = 45 × (170.45 ÷ 60) ≈ **₱127.84**
- **Gross** = 12,272.73 + 2,000 + 426.14 + 1,772.73 − 127.84 ≈ **₱16,343.76**

**Step 4 — deductions** (on the ₱30,000 monthly basic)
- SSS ≈ **₱519.00** · PhilHealth = 30,000 × 2.75% = **₱825.00** · Pag-IBIG (capped) =
  **₱200.00**
- Withholding tax: taxable = 16,343.76 − (519 + 825 + 200) = 14,799.76 → falls in the
  0% bracket → **₱0.00**
- Loan amortization = **₱1,000.00**

**Step 5 — net pay**
- Net = 16,343.76 − (519 + 825 + 200 + 0 + 1,000) ≈ **₱13,799.76**

**The live "before/after" demo (your strongest moment):** approve Juan's pending **Jun 15
vacation leave**, then re-process. Jun 15 flips from *absent* to *paid leave*, adding one
daily rate (~₱1,363.64) to basic pay, and his net rises to roughly **₱15,163**. This
demonstrates the attendance → payroll pipeline reacting live to an HR action.

---

## Part 8 — Panelist question bank (with model answers)

### A. Conceptual / "explain your system"
- **"Walk us through what happens when payroll is processed."** → Give the Part 4
  sequence: gather each employee's logs, schedule, holidays, and approved leaves →
  `aggregateAttendance` turns them into hour buckets → `calculatePayrollFromAttendance`
  turns buckets into pesos and applies deductions → a payslip is saved and loan balances
  update.
- **"Why is attendance the basis of pay?"** → Because pay must reflect actual work: a
  full present day earns a full daily rate, absences reduce pay, lateness is deducted,
  and extra work (OT, holiday, night shift) is paid at the correct premium. Hardcoding a
  fixed salary would be inaccurate for partial months.

### B. Technical / architecture
- **"What technologies did you use and why?"** → Part 3. Emphasize end-to-end TypeScript
  type safety catching errors before runtime — critical for payroll accuracy.
- **"Where does the actual computation live?"** → In one module, `lib/payroll-calc.ts`,
  kept separate from the API routes. That separation means the same functions power both
  the live payslip generation *and* the `verify-payroll.ts` test harness, so what we test
  is exactly what runs in production.
- **"How do you know your calculations are correct?"** → We have a verification harness
  (`scripts/verify-payroll.ts`) that runs the identical engine functions against known
  seeded data and prints every line item for manual checking against hand computation.
- **"What's a migration?"** → A versioned SQL file that builds/changes the database
  schema. Ours are in `drizzle/`, applied in order by `db:migrate`, so the database can
  be rebuilt reproducibly on any machine.

### C. Philippine-compliance
- **"Where did your SSS/PhilHealth/Pag-IBIG/tax rates come from?"** → From the published
  government contribution tables and the BIR TRAIN-law withholding brackets; they're
  defined as constants in `payroll-calc.ts` so they're easy to update when the government
  revises them. (Know that PhilHealth is 2.75% and the tax table is TRAIN-law.)
- **"How do you handle holidays?"** → Two types. A **regular holiday** is paid even if
  unworked (2× if worked); a **special non-working day** is "no work, no pay" (1.3× if
  worked). Holidays are stored in a `holidays` table and checked per day during
  aggregation.
- **"Night differential?"** → An extra 10% on hours worked between 22:00 and 06:00,
  computed by measuring how much of each punched span overlaps that window.

### D. Security
- **"How do you prevent an employee from seeing others' salaries?"** → Server-side
  authorization on every request. Employee-scoped queries only return the caller's own
  rows, and role checks (`requireRole`) block access to admin/HR endpoints with a 403 —
  the restriction isn't just hidden in the UI.
- **"How are passwords stored?"** → Hashed by Better Auth; we never store or log plain
  passwords. Sessions live in PostgreSQL and expire.

### E. Testing / validation
- **"How did you test it?"** → (1) The verification harness for calculation correctness;
  (2) role-based manual testing (admin/HR/employee flows); (3) user acceptance testing
  with testers following a scripted scenario and giving feedback through the built-in
  feedback module. See `docs/testing-guide.md`.
- **"What was your test data?"** → A realistic seeded scenario: employees on day and
  night shifts, a late arrival, overtime, holidays, a loan, and a leave request — so
  every pay component is exercised.

### F. Scope, limitations, future work
- **"What can't it do yet?"** → Answer honestly (Part 9): no PDF/email payslip delivery,
  no full audit log, no BIR year-end forms, single-company. Then immediately frame them
  as **future enhancements**, which shows you understand the domain.

---

## Part 9 — Defending the limitations (don't get rattled)

Panelists *will* find gaps. The move is: **acknowledge → justify scope → state the
enhancement.** Never argue that a real gap isn't one.

| If they say… | You say… |
|---|---|
| "There's no PDF payslip." | "Correct — payslips render on-screen with the full breakdown. PDF export is a planned enhancement; the computed data is already structured for it." |
| "It doesn't email payslips." | "Right. Email delivery is configured (Resend) but intentionally out of scope for this version; wiring it to the release step is a documented next step." |
| "There's no audit trail." | "Agreed — a who-changed-what history is important for production payroll compliance and is in our recommendations for future work." |
| "Tax looks low per cutoff." | "The withholding brackets are the TRAIN-law monthly table; applying them per semi-monthly cutoff is a deliberate simplifying assumption we document, and it can be switched to the semi-monthly table as an enhancement." |
| "What about large companies?" | "The current design targets small-to-mid headcounts. For large payrolls we'd add pagination and move processing to a background job queue — noted in future work." |

**Golden rule:** a thesis defense rewards *knowing your own boundaries*. A confident
"that's a documented limitation and here's how we'd extend it" scores better than
pretending the gap doesn't exist.

---

## Part 10 — Defense-day checklist

- [ ] Run `bun run db:reset-seed` on a **fresh** database the morning of the defense.
- [ ] Run `scripts/verify-payroll.ts` and **write down the exact seeded net-pay figures.**
- [ ] Do a full dry-run of the Part 7 before/after leave demo; time yourself.
- [ ] Have `docs/testing-guide.md` open in case they ask about your testing process.
- [ ] Prepare a backup: screenshots or a short screen recording of the working flow, in
      case of a projector/Wi-Fi/database failure.
- [ ] Know these five numbers cold for one sample employee: daily rate, gross, total
      deductions, and net — and *where each comes from*.
- [ ] Assign roles among your group: one drives the demo, one answers technical
      questions, one handles compliance/scope questions.
- [ ] Re-read Part 1 (the pitch) and Part 9 (limitations) right before you walk in.

You built a real, working, PH-aware payroll system with proper security and a clean
separation between the computation engine and the rest of the app. Know *why* you made
each choice, be honest about the edges, and you'll defend it well. Good luck. 🎓
