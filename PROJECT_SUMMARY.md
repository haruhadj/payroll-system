# Payroll System — Project Summary & Feature Status

> Reflects the current state of the system. Several features listed as "missing" in
> earlier drafts are now implemented — this document has been updated to match the code.

## What's Built

### Auth & Access Control
- Better Auth with email/password, email verification, forgot/reset password
- Roles: `admin`, `hr`, `employee`
- Two-gate RBAC enforced per route: `authMiddleware` (401 if not signed in) +
  `requireRole(...)` (403 if role not allowed)
- Admin user management (create users, change roles, delete) — `server/index.ts`

### Employee Management
- Create, read, update, delete employees
- Fields: employee no, department, position, employment type (full-time / part-time /
  contractual), **basic salary, per-employee allowance**, hire date, per-employee
  deduction toggles (SSS/PhilHealth/Pag-IBIG/tax)
- Employees linked 1:1 to a user account
- Filter by department / position with pagination
- CSV **export** and **import** of employees (`server/routes/tools.ts`, Tools page)

### Absences (exception-based attendance)
- Staff are monthly-paid, so every scheduled school day (company-wide `workDays` setting)
  is assumed worked; HR only logs the exceptions (`absences` table: employee, date, reason)
- No punch clock, no per-employee schedule — matches how school payroll actually runs
- Feeds directly into payroll (see engine below)

### Leaves & Loans
- Leave credits per type (vacation / sick / emergency) with balance tracking
- Leave requests with approval workflow; approved paid leave earns a day's pay in payroll
- Loans with per-cutoff amortization, balance tracking, and auto-`paid` when cleared

### Payroll Processing — absence-driven engine
- Create payroll periods (label, date range); lifecycle: `draft → processed → released`
- Bulk auto-generate payslips on "process" for every **active** employee
- Computation engine (`lib/payroll-calc.ts`) turns the school-week calendar + logged
  absences + approved leaves into day buckets, then into pesos:
  - Basic pay = daily rate × days present + paid-leave days at the daily rate (or a flat
    amount)
  - No late/rest-day/holiday premium math — monthly-paid employees already have those
    folded into their basic salary under PH labor practice
- PH statutory deductions on monthly basic salary: SSS (bracketed), PhilHealth (2.75%),
  Pag-IBIG, BIR TRAIN-law withholding tax — each toggleable system-wide and per employee
- Loan amortization deducted per cutoff; balances decrement only when a fresh payslip is
  created (re-processing never double-charges)
- Optional 13th-month accrual (1/12 of basic) per cutoff
- Verification harness (`scripts/verify-payroll.ts`) runs the exact engine functions
  against seeded data for manual correctness checking

### Payslips
- Per-employee per-period payslip with full breakdown: basic, allowances, gross,
  SSS/PhilHealth/Pag-IBIG/tax, loan, 13th-month, days worked, net pay
- Status lifecycle: `pending → approved → paid`, with an approve/mark-paid route
  (`PATCH /api/payslips/:id`, admin/HR only)
- Employees can view **their own** payslips only (enforced server-side)

### Configurable Payroll Settings
- Singleton `payrollSettings`: working days/month, school `workDays`, statutory on/off
  switches, tax frequency, paid-leave flat-amount vs. actual-rate toggle
- Company profile (name, address, contact) — `companyProfile`
- Manage Options: designations, groups, teams

### Dashboard & Reports (admin/hr only)
- Overview: employee count, active payroll periods, pending payslips, average feedback
- Payroll-summary report (gross/net/deductions per period)

### Employee Self-Service
- Own payslips, own profile (`userProfiles`, `userDocuments`), leave requests, feedback

### Feedback
- Employee submits rating (1–5) + comment per payroll period (one per employee per period)
- Admin can view all feedback; average rating surfaces on the dashboard

### Email
- Resend client configured (`lib/resend.ts`) and wired to **password reset**; not yet
  triggered on payslip release

---

## Known Limitations / Future Work

### Higher priority
| Item | Notes |
|---|---|
| **Payslip PDF export** | Payslips render on-screen; no downloadable PDF yet. Data is already structured for it. |
| **Payslip email/notification on release** | Resend is configured for auth email but not triggered when a period is released. |
| **Audit log / change history** | No who-changed-what trail — important for production payroll compliance. |
| **Duplicate/overlapping period guard** | No validation preventing two periods with the same or overlapping date range. |

### Medium priority
| Item | Notes |
|---|---|
| **Multiple allowance types** | Single flat `allowance` field; no transportation/meal/COLA split. |
| **Bank-format payroll export** | Employee CSV export exists; no payslip/payroll export in PESONet/InstaPay bank layout. |
| **Tax period alignment** | TRAIN-law brackets are monthly figures applied per semi-monthly cutoff (documented simplifying assumption). |
| **In-app notifications** | No push/in-app alert when a payslip becomes available. |

### Nice to have / scaling
| Item | Notes |
|---|---|
| **Department-level payroll summary** | Current report is period-level only. |
| **Year-to-date view & BIR Form 2316 / alphalist** | Annual PH tax reporting not generated. |
| **Org chart / hierarchy** | No manager → subordinate relationship. |
| **Multi-company / multi-branch** | Single-company for now. |
| **Background job queue for processing** | Synchronous processing is fine for small/mid headcounts; large payrolls would benefit from a queue (Inngest/Trigger.dev). |

---

## Resolved (previously flagged as bugs)
- **`daysWorked` hardcoded to 22** — resolved. Pay is now driven by actual attendance via
  `aggregateAbsences` → `daysPresent`.
- **No per-employee allowance** — resolved. `allowance` is a per-employee field applied
  during processing.
- **No approve/reject for payslips** — resolved. `PATCH /api/payslips/:id` moves a payslip
  to `approved`/`paid` (admin/HR).
- **No attendance / leave** — resolved. Absences, leaves, and loans all feed the engine.

---

## Summary Score

| Category | Status |
|---|---|
| Auth & RBAC | Complete |
| Employee CRUD + CSV import/export | Complete |
| Absences (exception-based attendance) | Complete |
| Leaves & Loans | Complete |
| PH Deduction Engine | Complete |
| Absence-driven Payroll Engine | Complete |
| Payroll Period Lifecycle | Complete (draft → processed → released) |
| Payslips (breakdown + approve/paid) | Complete; delivery (PDF/email) pending |
| Reporting | Basic (period summary) |
| Notifications / Email | Auth email wired; payslip delivery pending |
| Compliance — 13th month | Implemented (per-cutoff accrual toggle) |
| Compliance — BIR year-end forms | Future work |
| Audit trail | Future work |
