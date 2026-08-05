# Testing Guide

A clear, step-by-step guide to get the payroll system running for testing, plus
preparation for tester questions, feedback, and thesis-defense Q&A.

> **Good news:** the seed script builds a complete demo scenario for you — 4 users,
> 2 employees, a logged unauthorized absence, a draft *June 2026 (1st Half)* period
> ready to process, leave credits, a pending leave request (with a matching logged
> absence so approving it has a visible payroll effect), and a sample loan. Most of
> your test data already exists; you just need to boot it correctly.

## Reality check: dev environment vs. where testers connect

Running `bun run dev` gives you `http://localhost:3000` on **your own machine**. A
remote/cloud dev session is **not** a place testers can reach. Decide where testers
will actually use it:

- **Option A — Local** (your laptop; one-at-a-time, screen-share, or same room).
  Fastest, zero deploy. Good for a defense demo where you drive.
- **Option B — Deployed** (Vercel + Supabase; testers on their own devices).
  Needed if multiple testers use it remotely and submit feedback themselves.

The setup below is the **local path** — and it's the prerequisite for both, since you
seed and verify locally before deploying. Deploy add-ons are at the bottom.

---

## Step-by-step setup (do this once)

### 1. Get a Postgres database

You need a real Postgres connection URL. Two easy choices:

- **Supabase** (recommended — already in this project's stack): create a project →
  Settings → Database → copy the **connection string** (URI). The app appends
  `?sslmode=require` and connects with `ssl: "require"`, so cloud Postgres
  (Supabase/Neon) works out of the box.
- **Local Postgres**: `createdb payroll` and use
  `postgresql://localhost:5432/payroll`.

### 2. Create `.env`

Copy the template and fill it in:

```bash
cp .env.example .env
```

The app references exactly **three** variables:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=re_xxxxxxxx        # optional for testing — see note
```

> **Resend note:** the key is only used for password-reset emails. Without a valid key,
> sign-in and the full payroll flow still work — only "forgot password" breaks. For
> testing, use the seeded accounts and a dummy key. If you *do* set a real key, the
> sender is `onboarding@resend.dev`, which on a free Resend key can only send to your
> own verified address.

### 3. Install, seed, run

This project uses **Bun** (there's a `bun.lock`):

```bash
bun install
bun run db:reset-seed     # drops, migrates, and seeds in one shot
bun run dev               # → http://localhost:3000
```

`db:reset-seed` = `db:reset && db:migrate && db:seed`. Use it any time you want a clean
slate before a testing session — it's your reset button.

### 4. Verify the payroll math BEFORE anyone touches it

There's a purpose-built harness for this. Run it and eyeball the numbers:

```bash
bun run tsx --env-file=.env scripts/verify-payroll.ts
```

It runs the **same** engine functions the live route uses
(`aggregateAbsences` + `calculatePayrollFromAbsences`) against the seeded data and
prints every line item (basic pay, loan amortization, SSS/PhilHealth/Pag-IBIG/tax, net).
If these look right, your defense-critical calculations are sound. **Do this first** — a
wrong net-pay number in front of a panel is the worst-case failure.

---

## Test accounts

Created by the seed script (`scripts/seed.ts`):

| Role | Email | Password | Can see |
|---|---|---|---|
| Admin | `admin@payroll.com` | `Admin@123456` | Everything |
| HR | `hr@payroll.com` | `Hr@123456` | Employees, payroll, payslips |
| Employee | `juan.delacruz@payroll.com` | `Employee@123` | Own payslips + feedback (EMP-001: a loan, a logged absence pending leave approval) |
| Employee | `maria.santos@payroll.com` | `Employee@123` | Own payslips + feedback (EMP-002: an unauthorized absence) |

---

## The demo / test script

Run this yourself as a smoke test, then hand it to testers (see the
[Tester Handout](./tester-handout.md)).

1. **Sign in as admin** → Dashboard loads with counts.
2. **Payroll → "June 2026 (1st Half)"** (status `draft`) → **Process**. Auto-generates
   payslips from the seeded absences. Juan shows an unpaid absence (Jun 15, pending
   leave) + loan deduction; Maria shows an unpaid unauthorized absence (Jun 10).
3. **Leaves** → approve Juan's **pending vacation (Jun 15)** → re-process the period →
   his payslip now shows **paid leave** for that day instead of an absence. (This is the
   scripted before/after moment — it demonstrates the absence → payroll pipeline live.)
4. **Payslips** → review breakdowns; **release** the period.
5. **Approve one payslip, then Mark Paid** — click **Approve**, then **Mark Paid**. A
   dialog asks for the **amount actually released**, pre-filled with the computed net
   pay. Type in a *different* number (e.g. add ₱50) and confirm. A **leakage badge**
   appears on that row (Overpayment/Underpayment) instead of "OK".
6. **Payroll → Leakage Report** (sidebar, under Payroll) → pick the same period → the
   payslip you just marked paid shows up with the expected vs. actual amounts and the
   flagged status, plus running totals at the top. This is the payroll-leakage-detection
   feature — see [Part 5 of the Defense Guide](./defense-guide.md#payroll-leakage-reconciliation)
   for how to explain it.
7. **Sign out → sign in as Juan** → he sees his own payslip only (RBAC check: `403` on
   admin routes). If his payslip was the one marked paid, he'll also see the "Amount
   Released" line and the same leakage badge on his own view.
8. **Feedback** → Juan submits a 1–5 rating + comment for the period.
9. **Back as admin → Feedback (admin)** → the rating appears; dashboard average rating
   updates.

Each tester should: log in as an employee, view their payslip, submit feedback. That
exercises auth, RBAC, and the built-in feedback capture in one pass.

---

## Preparing for tester questions & feedback

The app has a **built-in feedback feature** (rating 1–5 + comment per payroll period,
admin-viewable) — use it as your primary capture channel. Supplement with a short form
for UX/bug notes that don't fit the 1–5 model.

### Anticipated tester questions — have answers ready

- *"Why is everything dated June 2026?"* — The seed data is dated June 2026 on purpose
  so the absences, leave request, and the cutoff period line up. Not a bug.
- *"I can't reset my password."* — Reset emails need a live Resend key; use the seeded
  accounts for testing.
- *"An employee can't see the dashboard / other people's payslips."* — Correct; that's
  RBAC enforced server-side, not a bug.
- *"Where do the deduction amounts come from?"* — Flat school-set contributions (SSS ₱350,
  PhilHealth ₱250, Pag-IBIG ₱200) configured in Settings, plus BIR TRAIN-law withholding
  tax. The PH statutory formulas (SSS brackets, PhilHealth 2.75%, Pag-IBIG) are also
  implemented and switchable on. See `lib/payroll-calc.ts`.
- *"Why did SSS disappear on the second payslip?"* — Not a bug. SSS is deducted on the 1st
  cutoff (the 15th) only; PhilHealth and Pag-IBIG on the 2nd cutoff (the 30th) only.
- *"Two periods, same salary, different daily rate — bug?"* — Also not a bug. The daily
  rate is half the monthly salary divided by the work days scheduled in *that* cutoff, so
  a cutoff with fewer school days has a higher daily rate.
- *"What's the 'Amount Released' / leakage badge on my payslip?"* — When HR marks a
  payslip paid, they record the amount actually handed out, which the system compares
  against the computed net pay. A mismatch is flagged so it can be caught and corrected.

### Known gaps — answer honestly if raised

Being upfront about scope shows you know your system:

- **Payslip PDF export** — not implemented; payslips are on-screen only.
- **Payslip email on "release"** — status changes but no email is sent yet.
- **Payslips list pagination** — fine at demo scale; would need paging for large
  headcounts.
- **Audit log** — no who-changed-what history yet (a real payroll compliance need).
- **Duplicate period date ranges** — not currently guarded against.

### Defense-prep questions to rehearse

- Walk through one payslip's net-pay computation line by line (rehearse with
  `verify-payroll.ts` output).
- How is authorization enforced? → Better Auth session + `requireRole()` RBAC
  middleware on every protected Hono route.
- How does attendance become pay? → logged absences + approved leave →
  `aggregateAbsences` → `calculatePayrollFromAbsences`.
- Why no holiday/overtime pay? → monthly-paid staff already have those folded into
  the basic salary under PH labor practice; know the reasoning cold. (Lateness *is*
  deducted when enabled — minutes past the grace period × daily rate ÷ shift hours ÷ 60.)
- Why do the two cutoffs deduct different contributions? → SSS on the 15th, PhilHealth +
  Pag-IBIG on the 30th, per the school's schedule; configurable in Settings.

---

## Option B: deploy for remote testers

If testers use their own devices:

1. Push your branch and deploy on **Vercel**.
2. Use **Supabase** for `DATABASE_URL`.
3. Set `NEXT_PUBLIC_APP_URL` to the Vercel URL.
4. Run `db:migrate` + `db:seed` against the Supabase DB once.

Everything else in this guide stays the same.

---

## Troubleshooting

- **App won't start / DB errors** — confirm `DATABASE_URL` is reachable and the URL is
  a full Postgres URI. Cloud DBs must allow SSL (the app forces `sslmode=require`).
- **Login fails for seeded users** — re-run `bun run db:reset-seed` to recreate them.
- **Numbers look off** — run `scripts/verify-payroll.ts` to see the raw line items
  before assuming a UI bug.
- **Want a clean slate mid-testing** — `bun run db:reset-seed` resets everything.
