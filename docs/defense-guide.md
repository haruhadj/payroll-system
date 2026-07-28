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

> "Our system is a web-based payroll management system for a Philippine school's staff —
> teachers, faculty, and administrative employees. Staff are monthly-paid, so the system
> assumes every scheduled school day is worked unless HR logs an exception: an absence,
> or an approved leave request. From that exception-based attendance log, the system
> computes each employee's pay for a cutoff period, then applies the mandatory government
> contributions (SSS, PhilHealth, Pag-IBIG) and BIR withholding tax to produce a payslip.
> It has role-based access for Admin, HR, and Employees, and employees can view their own
> payslips and submit feedback. It's built as a modern, type-safe full-stack TypeScript
> web application."

That single paragraph answers "What did you build?" — the most common opening question.

---

## Part 2 — Problem, objectives, and scope

**The problem.** Manual payroll (spreadsheets, hand calculation) is slow, error-prone,
and hard to audit — especially with Philippine-specific rules (SSS/PhilHealth/Pag-IBIG
brackets, TRAIN-law tax). School staff are monthly-paid on fixed contracts, not tracked
by a biometric punch clock, so a school needs a system built around that reality rather
than a corporate shift-based time-and-attendance model.

**General objective.** To design and develop a web-based payroll management system for
school staff that automates exception-based attendance and Philippine statutory
deductions.

**Specific objectives (typical phrasing — align with your actual paper).**
1. Record and manage employees and an exception-based absence log.
2. Automatically compute gross pay, deductions, and net pay per cutoff period.
3. Apply PH statutory contributions (SSS, PhilHealth, Pag-IBIG) and BIR withholding tax.
4. Enforce role-based access (Admin / HR / Employee) with secure authentication.
5. Let employees view their own payslips and submit feedback.
6. Detect payroll leakage by reconciling the system-computed net pay against the amount
   actually released to each employee.

**Scope — what it does.** Employee management, absence logging, leave requests, loans,
payroll period processing, payslip generation with a full earnings/deductions breakdown,
dashboards and reports, and a feedback module.

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

## Part 4 — How the core flow works: from absence log to payslip

This is the heart of the system. Learn this sequence cold.

1. **Setup data exists:** employees (with a monthly `basicSalary` and `allowance`), the
   company-wide school week (`payrollSettings.workDays`, e.g. Mon–Fri), and system
   `payrollSettings` (working days per month, statutory toggles).
2. **Attendance is exception-based:** every scheduled school day is assumed worked. HR
   only creates a row when something deviates — an **absence** (`absences` table:
   employee, date, reason) or an approved **leave request** (paid or unpaid).
3. **A payroll period** is created (e.g. "June 2026 (1st Half)", Jun 1–15) with status
   `draft`.
4. **Processing** (`PATCH /api/payroll/:id` → status `processed`) runs, for every active
   employee, two engine functions from `lib/payroll-calc.ts`:
   - **`aggregateAbsences(...)`** — walks each scheduled day in the period and classifies
     it as **present** (default), **absent** (a logged absence), or **leave** (an
     approved leave request, paid or unpaid), producing day counts: days present, paid
     leave days, unpaid absence/leave days.
   - **`calculatePayrollFromAbsences(...)`** — turns those day counts into pesos: basic
     pay = daily rate × days present + paid-leave days at the daily rate (or a flat
     amount) = gross; then applies SSS/PhilHealth/Pag-IBIG/tax and loan amortization =
     **net pay**.
   - The result is inserted as a **payslip** row (status `pending`). Active loan balances
     are decremented by the amortization deducted — but **only when a new payslip is
     actually created**, so re-processing a period never double-charges a loan.
5. **Release** (status `released`) marks the period as finalized for employees to view.
6. **Employees** sign in and see **only their own** payslips (enforced server-side), and
   can submit **feedback** (rating 1–5 + comment) for the period.

**Key design decision to be able to defend:** monthly-paid staff are assumed present by
default — HR logs exceptions, not attendance. This mirrors how schools actually run
payroll for teachers (fixed monthly salary, no biometric punch clock) and avoids
building a corporate shift-based time-and-attendance system nobody in the school would
use. There's deliberately no late/rest-day/holiday premium math: under PH labor
practice, monthly-paid employees already have holiday and rest-day pay folded into their
monthly rate, so computing it separately would double-count.

---

## Part 5 — The computation engine explained simply

All of this is in `lib/payroll-calc.ts`. You do **not** need to recite code — you need to
explain the *logic* in plain words.

### Rates come from two places
- **Per employee:** `basicSalary` (monthly) and `allowance`.
- **System settings (`payrollSettings`):** working days per month (**22**), the school
  `workDays` (e.g. Mon–Fri), paid-leave valuation (flat amount or actual daily rate), and
  on/off switches for each statutory deduction.

### The building-block rate
- **Daily rate** = monthly `basicSalary` ÷ `workingDaysPerMonth` (22).

### Earnings
- **Basic pay** = daily rate × days present + paid-leave days valued at the daily rate
  (or a flat amount, per the "actual rate" toggle).
- **Gross pay** = basic pay + allowance.

There's no overtime, night-differential, rest-day, or holiday premium — school staff
don't punch a time clock, and monthly-paid employees already have holiday/rest-day pay
built into their basic salary under PH labor practice.

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

### Payroll leakage reconciliation

This is the module that answers *"how do you know the computed payroll actually
matches what got paid out?"* — a common panel question and, if it's in your paper, a
stated objective (see Part 2, objective 6).

**The idea.** The system already computes an authoritative expected `netPay` for every
payslip. But the peso amount that physically leaves the school's hands (cash, check, or
bank transfer) is a separate real-world event the system doesn't otherwise witness. So
when HR/Admin marks a payslip **"Paid"**, the system prompts for the **amount actually
released**, pre-filled with the computed `netPay` but editable. That figure is saved as
`actualNetPay` on the payslip, alongside `paidAt`.

**The comparison.** `computeLeakage()` in `lib/payroll-calc.ts` subtracts:

> **Leakage = Actual Net Pay − Computed Net Pay**

- **Leakage > 0 → Overpayment** (more was released than computed)
- **Leakage < 0 → Underpayment** (less was released than computed)
- **Leakage = 0 → OK** (matches exactly)
- **`actualNetPay` still null → Unreleased** (not yet marked paid, nothing to reconcile)

**Where it shows up.** A per-payslip badge on the payroll run screen and on the
employee's own payslip view (once released), plus a dedicated **Payroll Leakage Report**
(`/payroll/leakage`) that lists every payslip in a period side-by-side with its expected
vs. actual amount and running totals of over/underpayment.

**Be upfront about what this is (and isn't) if asked.** This is a **reconciliation
control**, not a fraud-detection system: `actualNetPay` is self-reported by whoever
releases the pay, so it catches honest clerical/counting errors (wrong bill count, a
typo, a shortchanged envelope) far better than it catches deliberate falsification. For
this thesis's target users — school administrative/finance staff doing manual or
semi-manual release — that's the realistic threat model, and it's exactly the kind of
discrepancy manual payroll is prone to and hard to audit after the fact.

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
Jun 1–15** (school week Mon–Fri). Monthly basic **₱30,000**, allowance **₱2,000**, an
active SSS loan (**₱1,000/cutoff**), and a logged absence on Jun 15 pending a vacation
leave request.

> **CRITICAL:** Before the defense, run `bun run tsx --env-file=.env scripts/verify-payroll.ts`
> and read off the *actual* figures for your seeded data — memorize **those** exact
> centavo amounts. The numbers below show the **method** and are accurate to the model,
> but rounding order can shift a few centavos. Never quote a number to the panel you
> haven't confirmed against the running system.

**Step 1 — building block**
- Daily rate = 30,000 ÷ 22 = **₱1,363.64**

**Step 2 — attendance buckets**
- Scheduled (Mon–Fri) days in Jun 1–15: **11**
- Days present: **10** (every scheduled day except Jun 15)
- Absent: **1 day** (Jun 15 — *before* the leave is approved)

**Step 3 — earnings**
- Basic pay = 1,363.64 × 10 ≈ **₱13,636.36**
- **Gross** = 13,636.36 + 2,000 ≈ **₱15,636.36**

**Step 4 — deductions** (on the ₱30,000 monthly basic)
- SSS ≈ **₱519.00** · PhilHealth = 30,000 × 2.75% = **₱825.00** · Pag-IBIG (capped) =
  **₱200.00**
- Withholding tax: taxable = 15,636.36 − (519 + 825 + 200) = 14,092.36 → falls in the
  0% bracket → **₱0.00**
- Loan amortization = **₱1,000.00**

**Step 5 — net pay**
- Net = 15,636.36 − (519 + 825 + 200 + 0 + 1,000) ≈ **₱13,092.36**

**The live "before/after" demo (your strongest moment):** approve Juan's pending **Jun 15
vacation leave**, then re-process. Jun 15 flips from *unpaid absence* to *paid leave* —
leave takes priority over the logged absence — adding one full daily rate (~₱1,363.64)
to basic pay. Net rises to roughly **₱14,456.00**, exactly one daily rate higher. This
demonstrates the absence → payroll pipeline reacting live to an HR action.

---

## Part 8 — Panelist question bank (with model answers)

### A. Conceptual / "explain your system"
- **"Walk us through what happens when payroll is processed."** → Give the Part 4
  sequence: gather each employee's logged absences and approved leaves →
  `aggregateAbsences` classifies each scheduled day as present/absent/leave →
  `calculatePayrollFromAbsences` turns those day counts into pesos and applies
  deductions → a payslip is saved and loan balances update.
- **"Why exception-based instead of a punch clock?"** → School staff are monthly-paid on
  fixed contracts and follow a class schedule, not a shift punch clock. Assuming presence
  by default and only recording exceptions (absences, leave) matches how school HR
  actually operates and avoids building biometric infrastructure nobody would use.

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
- **"How do you handle holidays/rest days?"** → Deliberately no separate computation.
  Under PH labor practice, employees paid on a monthly basis are considered paid for all
  days of the month, including unworked rest days and holidays — that pay is already
  folded into the monthly rate, so computing it again would double-count it. This is a
  documented simplifying assumption appropriate for monthly-paid school staff.

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
- **"What was your test data?"** → A realistic seeded scenario: two employees, an
  unauthorized absence, a loan, and a pending leave request — so every pay component
  (present days, paid leave, unpaid absence, loan amortization) is exercised.

### F. Payroll leakage
- **"How do you detect payroll leakage?"** → When a payslip is marked "Paid," the
  releaser enters the amount actually released. The system subtracts the computed net
  pay from that figure — a nonzero result flags Overpayment or Underpayment, surfaced as
  a badge and on the dedicated Leakage Report (Part 5).
- **"Isn't the actual amount just self-reported? Couldn't someone lie?"** → Yes — it's a
  reconciliation control against clerical error, not a fraud-proof audit. It's scoped to
  the realistic workflow of our target testers (school finance staff doing manual/
  semi-manual release), where miscounts and typos are the dominant risk, not deliberate
  falsification. A stronger control (e.g. requiring a second approver, or importing a
  bank disbursement file) is a natural future enhancement.

### G. Scope, limitations, future work
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
| "Leakage relies on a manually typed number — how is that reliable?" | "It's a reconciliation control, not a fraud-proof audit — it catches the honest clerical errors that manual payroll is actually prone to. A second-approver check or bank-file import is a documented future enhancement." |

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
