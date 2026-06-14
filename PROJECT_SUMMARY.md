# Payroll System — Project Summary & Feature Gap Analysis

## What's Built

### Auth & Access Control
- Better Auth with email/password, email verification, forgot/reset password
- Roles: `admin`, `hr`, `employee`
- RBAC middleware enforced per route

### Employee Management
- Create, read, update, delete employees
- Fields: employee no, department, position, employment type (full-time / part-time / contractual), basic salary, hire date
- Employees linked 1:1 to a user account
- Filter by department / position with pagination

### Payroll Processing
- Create payroll periods (label, date range)
- Status lifecycle: `draft → processed → released`
- Bulk auto-generate payslips on "process" (all employees, no per-employee overrides yet)
- PH-specific deduction calculations (SSS, PhilHealth, Pag-IBIG, BIR TRAIN Law withholding tax)

### Payslips
- Per-employee per-period payslip: basic pay, allowances, gross, deductions breakdown, net pay
- Status: `pending → approved → paid`
- Employee can view their own payslips only

### Dashboard (admin/hr only)
- Total employee count, active payroll periods, pending payslips, average feedback rating
- Latest payroll period, recent feedback feed
- Payroll summary report (gross/net/deductions per period)

### Feedback
- Employee submits rating (1–5) + comment per payroll period
- One feedback per employee per period
- Admin can view all feedback

### Email
- Resend client configured (lib/resend.ts) — not wired to any trigger yet

---

## Missing Features — Prioritized

### MUST HAVE (Core Payroll Functionality)

| Feature | Why it's missing / impact |
|---|---|
| **Overtime & late/absent deductions** | `daysWorked` exists in `calculatePayroll` but is never passed from the payslip flow — every employee gets 22/22 days regardless |
| **Per-employee allowances on payslip generation** | Allowances default to 0; no UI or field to configure them per employee before processing |
| **Leave management** | No leave table, no balance tracking — feeds directly into absent deductions |
| **Payslip email delivery** | Resend is set up but sending is never triggered when a period is "released" |
| **Payslip PDF export** | Employees need a downloadable payslip; no PDF generation exists |
| **Approve/reject individual payslips** | `payslip.status` has `approved` but no route or UI to toggle it |
| **Audit log / change history** | No record of who changed what — required for payroll compliance |

### SHOULD HAVE (Common in Production Payroll Systems)

| Feature | Notes |
|---|---|
| **Attendance / timesheet integration** | Manual or import-based; feeds `daysWorked` into payslip calc |
| **13th month pay computation** | PH-required annual benefit; no schema or calc logic |
| **Multiple allowance types** | Transportation, meal, COLA, etc. — currently one flat `allowances` field |
| **Loan / salary advance tracking** | Deduction per period, balance tracking |
| **CSV / Excel payroll export** | For accounting and bank payroll upload (PESONet, InstaPay) |
| **Employee self-service** | Employees can only read their payslip — no profile update, no leave request, no payslip dispute |
| **Notifications** | No in-app or push notification when payslip is available |
| **Search on employees list** | API supports `ilike` filter but no search input in UI |

### NICE TO HAVE (Competitive/Scaling Features)

| Feature | Notes |
|---|---|
| **Department-level payroll summary** | Current report is only period-level |
| **Year-to-date earnings / deductions view** | Needed for BIR Form 2316 |
| **BIR Form 2316 / alphalist generation** | Annual tax reporting, PH-specific |
| **Org chart / hierarchy** | Manager → subordinate relationship |
| **Mobile-responsive payslip view** | Current UI uses Tailwind but no mobile-specific payslip layout |
| **Multi-company / multi-branch** | Single-company for now |
| **Background job queue for payroll processing** | Inngest/Trigger.dev mentioned in stack but not implemented — large headcounts will time out |

---

## Critical Bugs / Risks to Fix Now

1. **`daysWorked` is hardcoded to 22** in the payroll processing route — partial month employees always get full pay.
2. **No per-employee allowance before processing** — allowances are always ₱0.
3. **Payslip "released" does nothing** beyond a status change — no email, no notification.
4. **No pagination in payslips list** — will break at scale.
5. **Payroll delete is allowed only on draft** (good) but there is no guard preventing duplicate period date ranges.

---

## Summary Score

| Category | Status |
|---|---|
| Auth & RBAC | Complete |
| Employee CRUD | Complete |
| PH Deduction Engine | Complete |
| Payroll Period Lifecycle | ~70% (processing works, release is a no-op) |
| Payslips | ~50% (generated, not approvable or deliverable) |
| Attendance / Leave | Missing |
| Reporting | Basic (period summary only) |
| Notifications / Email | Wired but not triggered |
| Compliance (BIR, 13th month) | Missing |
