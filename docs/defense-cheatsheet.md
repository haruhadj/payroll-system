# Defense-Day Cheat Sheet (print this)

One page to hold during the defense. Full detail is in `defense-guide.md`.

---

## The pitch (say this first)
> "A web-based payroll system for a Philippine school's staff. Staff are monthly-paid,
> so every scheduled school day is assumed worked unless HR logs an absence or an
> approved leave request covers it. From that exception-based attendance log, it
> computes each employee's pay per cutoff, then applies SSS, PhilHealth, Pag-IBIG, and
> BIR withholding tax to produce a payslip. Role-based access for Admin, HR, and
> Employees. Built in end-to-end type-safe TypeScript."

## The stack (four layers)
**Next.js + Tailwind (UI)** → **Hono API + Zod validation** → **Payroll engine
(`lib/payroll-calc.ts`)** → **PostgreSQL + Drizzle ORM**. Auth: **Better Auth**.

## The one flow to know
Logged absences + approved leaves → **`aggregateAbsences`** (day counts) →
**`calculatePayrollFromAbsences`** (pesos) → **payslip** saved, loan balances updated.
Period lifecycle: **draft → processed → released.**

---

## The numbers — Juan dela Cruz (EMP-001), June 1–15
**⚠ Run `verify-payroll.ts` and overwrite these with the exact live figures before you defend.**

| Item | Value | Where it comes from |
|---|---|---|
| Monthly basic | ₱30,000 | employee record |
| Daily rate | ₱1,363.64 | basic ÷ 22 |
| Scheduled days (Mon–Fri) | 11 | school week × Jun 1–15 |
| Basic pay (10 present) | ₱13,636.36 | daily × days present |
| Allowance | ₱2,000.00 | employee record |
| **Gross** | **₱15,636.36** | basic + allowance |
| SSS / PhilHealth / Pag-IBIG | ₱519 / ₱825 / ₱200 | on ₱30,000 monthly basic |
| Withholding tax | ₱0.00 | taxable under first TRAIN bracket |
| Loan amortization | ₱1,000 | per-cutoff, capped at balance |
| **NET PAY** | **≈ ₱13,092.36** | gross − all deductions |

**Live demo:** approve Juan's Jun-15 leave (currently logged as an absence) → re-process
→ that day flips from unpaid absence to paid leave → net rises ~₱1,363.64 (one paid day)
to **≈ ₱14,456.**

---

## Formulas (say them plainly)
- Daily rate = basic ÷ 22
- Basic pay = daily rate × days present + paid-leave days × daily rate (or flat amount)
- No overtime / night-diff / holiday / late math — monthly-paid staff already have
  holiday and rest-day pay folded into their basic salary under PH labor practice
- PhilHealth = **2.75%** of basic · Tax = TRAIN-law on (gross − SSS − PhilHealth − Pag-IBIG)
- **Net = Gross − (SSS + PhilHealth + Pag-IBIG + Tax + Loans) + 13th-month**

## Security (one breath)
Every protected route: **401** if not logged in, **403** if wrong role. Passwords hashed,
sessions in Postgres, all input validated by **Zod**. Employees only ever get their own
data — enforced on the server.

## Rapid answers
- **Why this stack?** One language end-to-end → compiler catches errors before runtime;
  critical for payroll accuracy.
- **How tested?** Verification harness for the math + role-based manual testing + user
  acceptance testing with the feedback module.
- **Rates source?** Published SSS/PhilHealth/Pag-IBIG tables + BIR TRAIN-law brackets,
  kept as constants so they're easy to update.

## If they find a gap (acknowledge → scope → enhance)
No PDF export · no payslip email on release · no audit log · no BIR 2316 · single-company.
Each is a **documented future enhancement**, not an oversight. Say so, calmly.

---
**Break glass:** projector/Wi-Fi/DB dies → open the screenshots/screen-recording backup.
