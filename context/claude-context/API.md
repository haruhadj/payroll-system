# API Routes Reference

All API routes are mounted at `/api` via Hono's Next.js integration and exported as an RPC type for type-safe frontend calls.

## Base Structure

**Backend:** `/server/index.ts` mounts all routers:
```typescript
const app = new Hono()
  .route("/employees", employeesRouter)
  .route("/payroll", payrollRouter)
  .route("/payslips", payslipsRouter)
  .route("/feedback", feedbackRouter)
  .route("/dashboard", dashboardRouter)

export type AppType = typeof app
export default app
```

**Next.js App Router Integration:** `/app/api/[[...route]]/route.ts`
```typescript
import { handle } from 'hono/vercel'
import { app } from '@/server'

export const runtime = 'nodejs' // or 'edge' for Vercel Edge Functions
export const { GET, POST, PUT, DELETE, PATCH } = handle(app)
```

**Frontend:** Use with Hono RPC client:
```typescript
import { hc } from "hono/client"
import type { AppType } from "@/server"

const client = hc<AppType>("/api")
```

---

## Authentication Routes

**Endpoint:** `/api/auth/[...all]`  
**Handler:** `app/api/auth/[...all]/route.ts`  
**Provider:** Better Auth

### POST /api/auth/sign-in
Sign in with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": true
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "employee"
  },
  "session": {
    "id": "uuid",
    "token": "...",
    "expiresAt": "2025-06-21T..."
  }
}
```

**Response (401):**
```json
{ "error": "Invalid email or password" }
```

### POST /api/auth/sign-up
Register new account. Creates user with role='employee'.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "Jane Doe"
}
```

**Response (201):**
User and session returned (auto-logged in).

**Response (400):**
Email already exists.

### POST /api/auth/sign-out
Invalidate session.

**Response (200):**
```json
{ "success": true }
```

### POST /api/auth/forget-password
Request password reset email. Triggers Resend email with reset link.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{ "success": true, "message": "Reset email sent" }
```

### POST /api/auth/reset-password
Set new password using reset token from email.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "password": "newpassword123"
}
```

**Response (200):**
Session created (auto-logged in with new password).

### GET /api/auth/session
Get current session. Called by `useSession()` hook.

**Response (200):**
```json
{
  "user": { ... },
  "session": { ... }
}
```

**Response (401):**
No valid session.

### POST /api/auth/callback/google
Handled by Better Auth. User redirected here after Google consent screen.

---

## Employee Routes

**Base path:** `/api/employees`  
**Auth required:** Yes  
**Roles:** 'admin', 'hr' for create/update/delete; 'employee' for read own

### GET /api/employees
List all employees (admin/hr only).

**Query params:**
- `department?: string` — filter by dept
- `position?: string` — filter by position
- `limit?: number` — default 50
- `offset?: number` — default 0

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "employeeNo": "EMP-001",
    "department": "Finance",
    "position": "Accountant",
    "employmentType": "full_time",
    "basicSalary": 50000,
    "hiredAt": "2023-01-15",
    "createdAt": "2023-01-20T..."
  },
  ...
]
```

**Response (401):**
Unauthorized (not logged in).

**Response (403):**
Forbidden (insufficient role).

### GET /api/employees/:id
Get single employee detail.

**Params:**
- `id`: employee UUID

**Response (200):**
Single employee object.

**Response (404):**
Employee not found.

### POST /api/employees
Create new employee record (admin/hr only). User account must already exist.

**Request:**
```json
{
  "userId": "uuid",
  "employeeNo": "EMP-002",
  "department": "IT",
  "position": "Developer",
  "employmentType": "full_time",
  "basicSalary": 60000,
  "hiredAt": "2024-01-01"
}
```

**Response (201):**
Created employee object with id.

**Response (400):**
Validation error (e.g., employeeNo already exists).

### PATCH /api/employees/:id
Update employee record (admin/hr only).

**Request:** (all fields optional)
```json
{
  "department": "HR",
  "basicSalary": 65000
}
```

**Response (200):**
Updated employee object.

**Response (404):**
Employee not found.

### DELETE /api/employees/:id
Delete employee record and cascade (admin only).

**Response (200):**
```json
{ "success": true }
```

**Response (403):**
Only admin can delete.

---

## Payroll Period Routes

**Base path:** `/api/payroll`  
**Auth required:** Yes  
**Roles:** 'admin', 'hr'

### GET /api/payroll
List all payroll periods.

**Query params:**
- `status?: 'draft' | 'processed' | 'released'`
- `limit?: number`
- `offset?: number`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "label": "June 1–15, 2025",
    "dateFrom": "2025-06-01",
    "dateTo": "2025-06-15",
    "status": "processed",
    "createdBy": "uuid",
    "createdAt": "2025-05-28T..."
  },
  ...
]
```

### POST /api/payroll
Create new payroll period (status='draft').

**Request:**
```json
{
  "label": "June 16–30, 2025",
  "dateFrom": "2025-06-16",
  "dateTo": "2025-06-30"
}
```

**Response (201):**
Created period object.

**Response (400):**
Date range overlaps with existing period.

### PATCH /api/payroll/:id
Update period status (transition workflow).

**Request:**
```json
{
  "status": "processed"
}
```

**Workflow transitions:**
- `draft` → `processed` (triggers payslip generation for all employees)
- `processed` → `released` (employees can now see payslips)

**Response (200):**
Updated period object.

**On status='processed':**
- System generates one payslip per active employee
- Each payslip calculated via `/lib/payroll-calc.ts`
- Payslips created with status='pending'

---

## Payslip Routes

**Base path:** `/api/payslips`  
**Auth required:** Yes  
**Roles:** 'employee' sees own; 'admin', 'hr' see all

### GET /api/payslips
List payslips. Filters by role automatically:
- Employee: only their own payslips
- HR/Admin: all payslips

**Query params:**
- `periodId?: uuid` — filter by period
- `employeeId?: uuid` — filter by employee (admin/hr only)
- `status?: 'pending' | 'approved' | 'paid'`
- `limit?: number`
- `offset?: number`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "employeeId": "uuid",
    "periodId": "uuid",
    "basicPay": 25000,
    "allowances": 2500,
    "grossPay": 27500,
    "sss": 1125,
    "philhealth": 412.50,
    "pagibig": 200,
    "withholdingTax": 1240.75,
    "netPay": 24521.75,
    "status": "pending",
    "createdAt": "2025-06-01T..."
  },
  ...
]
```

### GET /api/payslips/:id
Get single payslip (only if employee is owner or user is admin/hr).

**Response (200):**
Single payslip object.

**Response (403):**
Forbidden (not your payslip and not admin/hr).

**Response (404):**
Payslip not found.

### PATCH /api/payslips/:id
Update payslip status (admin/hr only).

**Request:**
```json
{
  "status": "approved"
}
```

**Workflow:**
- `pending` → `approved` (HR approves)
- `approved` → `paid` (HR marks as released to bank)

**Response (200):**
Updated payslip object.

### GET /api/payslips/summary/:periodId
Get aggregate payslip stats for a period (admin/hr only).

**Response (200):**
```json
{
  "periodId": "uuid",
  "totalPayslips": 25,
  "totalNetPay": 600000,
  "totalDeductions": 100000,
  "averageNetPay": 24000,
  "paymentStatus": {
    "pending": 5,
    "approved": 15,
    "paid": 5
  }
}
```

---

## Feedback Routes

**Base path:** `/api/feedback`  
**Auth required:** Yes  
**Roles:** 'employee' submits own; 'admin', 'hr' view all

### POST /api/feedback
Submit feedback for a payroll period (employees only).

**Request:**
```json
{
  "periodId": "uuid",
  "rating": 4,
  "comment": "Payroll was processed quickly this period."
}
```

**Validation:**
- `rating` must be 1–5
- `comment` max 1000 chars
- Only one feedback allowed per (employee, periodId) — returns 409 if duplicate

**Response (201):**
```json
{
  "id": "uuid",
  "employeeId": "uuid",
  "periodId": "uuid",
  "rating": 4,
  "comment": "...",
  "createdAt": "2025-06-15T..."
}
```

**Response (409):**
Feedback already submitted for this period.

### GET /api/feedback/mine
Get logged-in employee's feedback history.

**Response (200):**
```json
[
  { "periodId": "uuid", "rating": 4, "createdAt": "..." },
  { "periodId": "uuid", "rating": 5, "createdAt": "..." },
  ...
]
```

### GET /api/feedback
List all feedback (admin/hr only).

**Query params:**
- `periodId?: uuid` — filter by period
- `employeeId?: uuid` — filter by employee
- `minRating?: number` — filter by rating >= value
- `limit?: number`
- `offset?: number`

**Response (200):**
Array of feedback objects with employee/period details.

### GET /api/feedback/summary
Get feedback aggregate stats (admin/hr only).

**Query params:**
- `periodId?: uuid` — defaults to all periods

**Response (200):**
```json
{
  "totalResponses": 20,
  "averageRating": 4.2,
  "ratingDistribution": {
    "1": 0,
    "2": 1,
    "3": 3,
    "4": 8,
    "5": 8
  },
  "periods": [
    {
      "periodId": "uuid",
      "label": "June 1–15",
      "avgRating": 4.1,
      "responseCount": 20
    },
    ...
  ]
}
```

**Analytics:** Use this for dashboard charts.

---

## Dashboard Routes

**Base path:** `/api/dashboard`  
**Auth required:** Yes  
**Roles:** 'admin', 'hr' only

### GET /api/dashboard/overview
Get high-level stats for admin dashboard.

**Response (200):**
```json
{
  "totalEmployees": 50,
  "activePayrollPeriods": 1,
  "pendingPayslips": 12,
  "averageFeedbackRating": 4.3,
  "latestPeriod": {
    "id": "uuid",
    "label": "June 1–15, 2025",
    "status": "processed"
  },
  "recentFeedback": [
    { "rating": 5, "employee": "John", "createdAt": "..." },
    ...
  ]
}
```

### GET /api/dashboard/reports/payroll-summary
Detailed payroll report (export-ready).

**Query params:**
- `periodId?: uuid` — specific period or all if omitted
- `format?: 'json' | 'csv'` — default json

**Response (200, JSON):**
```json
{
  "generatedAt": "2025-06-15T...",
  "periods": [
    {
      "periodId": "uuid",
      "label": "June 1–15",
      "totalEmployees": 50,
      "totalGrossPay": 1250000,
      "totalDeductions": 200000,
      "totalNetPay": 1050000,
      "payslips": [
        {
          "employeeNo": "EMP-001",
          "name": "John Doe",
          "grossPay": 25000,
          "deductions": 4000,
          "netPay": 21000
        },
        ...
      ]
    }
  ]
}
```

**Response (200, CSV):**
CSV-formatted download-friendly data.

---

## Middleware & Auth Flow

### authMiddleware
Applied to all protected routes. Verifies session cookie.

```typescript
// In route handler:
const user = c.get("user")      // { id, email, name, role }
const session = c.get("session") // { id, token, expiresAt, ... }
```

Fails with 401 if no valid session.

### requireRole(...roles)
Applied after authMiddleware. Checks `user.role`.

```typescript
router.get("/", requireRole("admin", "hr"), async (c) => {
  // Only admin or hr can access
})
```

Fails with 403 if user role not in allowed list.

---

## Error Responses

Standard error format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... } // optional
}
```

**Common status codes:**
- `400` — Bad request (validation error)
- `401` — Unauthorized (no session)
- `403` — Forbidden (insufficient role/permission)
- `404` — Not found
- `409` — Conflict (e.g., duplicate feedback)
- `500` — Server error

---

## Frontend Usage Example

```typescript
"use client"
import { hc } from "hono/client"
import type { AppType } from "@/server"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

const client = hc<AppType>("/api")
const qc = useQueryClient()

// Fetch payslips with automatic type inference
export function PayslipsPage() {
  const { data: payslips, isLoading } = useQuery({
    queryKey: ["payslips"],
    queryFn: async () => {
      const res = await client.payslips.$get({ query: { periodId: "..." } })
      return res
    }
  })

  // Submit feedback with auto-validation
  const { mutate: submitFeedback } = useMutation({
    mutationFn: (data: { rating: number; comment?: string }) =>
      client.feedback.$post({ json: { periodId: "...", ...data } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback", "mine"] })
    }
  })

  if (isLoading) return <div>Loading...</div>
  return <div>{payslips?.map(p => <PayslipCard key={p.id} {...p} />)}</div>
}
```

Every type is inferred from the server—no manual API types needed.
