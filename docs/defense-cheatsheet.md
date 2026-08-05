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
| Cutoff base | ₱15,000 | monthly ÷ 2 cutoffs |
| Scheduled days (Mon–Fri) | 11 | school week × Jun 1–15 |
| Daily rate | ₱1,363.64 | cutoff base ÷ 11 scheduled days |
| Basic pay (10 present) | ₱13,636.36 | daily × days present |
| Allowance | ₱2,000.00 | employee record |
| **Gross** | **₱15,636.36** | basic + allowance |
| SSS | ₱350.00 | flat, 1st cutoff only |
| PhilHealth / Pag-IBIG | ₱0 / ₱0 | flat ₱250 / ₱200, **2nd cutoff only** |
| Withholding tax | ₱0.00 | taxable under first TRAIN bracket |
| Loan amortization | ₱1,000 | per-cutoff, capped at balance |
| **NET PAY** | **≈ ₱14,286.36** | gross − all deductions |

**Watch for:** the 2nd cutoff (Jun 16–30) deducts **₱450** instead — PhilHealth ₱250 +
Pag-IBIG ₱200, and no SSS. That split is the point; don't let it read as a bug.

**Live demo:** approve Juan's Jun-15 leave (currently logged as an absence) → re-process
→ that day flips from unpaid absence to paid leave → net rises ~₱1,363.64 (one paid day)
to **≈ ₱15,650.**

---

## Formulas (say them plainly)
- Daily rate = **cutoff base ÷ the work days scheduled in *that* cutoff** (11 or 7, not a
  fixed 22) — so a day missed in a short cutoff costs more than one in a long cutoff
- Basic pay = daily rate × days present + paid-leave days × daily rate (or flat amount)
- Late deduction = minutes late × (daily rate ÷ shift hours ÷ 60), past the grace period
- No overtime / night-diff / holiday math — monthly-paid staff already have holiday and
  rest-day pay folded into their basic salary under PH labor practice
- Contributions are **flat company amounts on a fixed cutoff**: SSS ₱350 on the 15th ·
  PhilHealth ₱250 + Pag-IBIG ₱200 on the 30th · Tax = TRAIN-law on (gross − contributions)
- **Net = Gross − (SSS + PhilHealth + Pag-IBIG + Tax + Loans + Late) + 13th-month**

## Payroll leakage (one breath)
When a payslip is marked **Paid**, HR enters the **amount actually released**. System
subtracts computed net pay from that → **Overpayment / Underpayment / OK**, shown as a
badge and on the **Leakage Report** (`/payroll/leakage`). It's a reconciliation control
for manual release, not fraud-proof — say so if pressed.

## Security (one breath)
Every protected route: **401** if not logged in, **403** if wrong role. Passwords hashed,
sessions in Postgres, all input validated by **Zod**. Employees only ever get their own
data — enforced on the server.

## Rapid answers
- **Why this stack?** One language end-to-end → compiler catches errors before runtime;
  critical for payroll accuracy.
- **How tested?** Verification harness for the math + role-based manual testing + user
  acceptance testing with the feedback module.
- **Rates source?** The school's own contribution schedule (flat ₱350/₱250/₱200, split
  across the two cutoffs), configurable in Settings. The published SSS/PhilHealth/Pag-IBIG
  tables and BIR TRAIN-law brackets are still implemented and switchable on — the school
  simply deducts fixed amounts in practice. Tax always uses the TRAIN-law brackets.

## If they find a gap (acknowledge → scope → enhance)
No PDF export · no payslip email on release · no audit log · no BIR 2316 · single-company.
Each is a **documented future enhancement**, not an oversight. Say so, calmly.

---
**Break glass:** projector/Wi-Fi/DB dies → open the screenshots/screen-recording backup.
