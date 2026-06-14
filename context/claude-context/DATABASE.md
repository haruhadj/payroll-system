# Database Schema Reference

## Drizzle ORM + Built-in Zod Validation

This project uses **Drizzle ORM** with auto-generated **Zod schemas** for runtime validation. All table definitions live in `/lib/db/schema.ts`, and Zod validation schemas are automatically generated using `createSelectSchema` and `createInsertSchema` from `drizzle-orm/zod`.

**Key files:**
- `/lib/db/index.ts` — Drizzle client instance configured for Supabase PostgreSQL
- `/lib/db/schema.ts` — Table definitions + auto-generated Zod schemas
- `drizzle.config.ts` — Migration configuration
- `drizzle/` — Auto-generated migration files

**Auto-generated Zod schemas example:**
```typescript
import { createSelectSchema, createInsertSchema } from 'drizzle-orm/zod'

// These are auto-generated from the table definition
export const selectEmployeeSchema = createSelectSchema(employees)
export const insertEmployeeSchema = createInsertSchema(employees).omit({ 
  id: true, 
  createdAt: true 
})
export const updateEmployeeSchema = insertEmployeeSchema.partial()
```

**Usage in Hono routes:**
```typescript
import { insertEmployeeSchema } from '@/lib/db/schema'

router.post('/', zValidator('json', insertEmployeeSchema), async (c) => {
  const validated = c.req.valid('json') // Fully typed and validated
  const result = await db.insert(employees).values(validated).returning()
  return c.json(result)
})
```

---

## Tables & Relationships

### User Management (Better Auth)

#### `user`
Core identity table. One user per email.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key, auto-generated |
| `name` | text | User's display name |
| `email` | text | Unique, lowercased |
| `emailVerified` | timestamp | Null if not verified |
| `image` | text | Avatar URL (optional) |
| `role` | enum | 'admin' \| 'hr' \| 'employee' (default: 'employee') |
| `createdAt` | timestamp | Account creation time |
| `updatedAt` | timestamp | Last update time |

**Constraints:**
- `email` is UNIQUE and case-insensitive
- `role` defaults to 'employee' on signup
- Admin must manually promote users to 'hr' or 'admin'

#### `account`
OAuth provider links (e.g., Google login).

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `userId` | uuid FK | References `user.id` ON DELETE CASCADE |
| `accountId` | text | Unique identifier from provider (e.g., Google ID) |
| `providerId` | text | Provider name ('google', 'email', etc.) |
| `accessToken` | text | OAuth access token (if needed) |
| `refreshToken` | text | OAuth refresh token (if needed) |
| `expiresAt` | timestamp | Token expiry (nullable) |
| `createdAt` | timestamp | Link creation time |
| `updatedAt` | timestamp | Last sync time |

**Composite key:** `(accountId, providerId)` should be unique per user.

#### `session`
Active login sessions. One per browser/device per user.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `userId` | uuid FK | References `user.id` ON DELETE CASCADE |
| `token` | text | Unique session token (sent as secure cookie) |
| `expiresAt` | timestamp | When session becomes invalid |
| `ipAddress` | text | Client IP at login (optional, for audit) |
| `userAgent` | text | Browser/device info (optional) |
| `createdAt` | timestamp | Login time |
| `updatedAt` | timestamp | Last activity time |

**Constraint:** `token` is UNIQUE.  
**Auto-cleanup:** Sessions older than `expiresAt` can be deleted via background job.

#### `verification`
Email verification codes, password reset tokens, etc.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `identifier` | text | Email or phone (e.g., "user@example.com") |
| `value` | text | OTP or reset token |
| `expiresAt` | timestamp | When code/token becomes invalid |
| `createdAt` | timestamp | Code generation time |
| `updatedAt` | timestamp | Last resend time |

**Usage:** Forgot password → create verification with reset token → send via Resend → user clicks link with token → verify and reset password.

---

### Payroll Domain

#### `employee`
Employee records. Linked 1:1 to a user; not all users are employees.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `userId` | uuid FK | References `user.id` ON DELETE CASCADE (one per user) |
| `employeeNo` | text | Unique employee ID (e.g., "EMP-001") |
| `department` | text | Dept name (e.g., "Finance", "IT") |
| `position` | text | Job title |
| `employmentType` | enum | 'full_time' \| 'part_time' \| 'contractual' |
| `basicSalary` | numeric(12,2) | Monthly base salary in PHP |
| `hiredAt` | date | Hire date (for tenure, benefits calc) |
| `createdAt` | timestamp | Record creation time |

**Constraints:**
- `userId` is UNIQUE (one employee per user)
- `employeeNo` is UNIQUE
- `basicSalary` must be positive

**Note:** When a user signs up with role 'employee', an admin must create their `employee` record manually to link them to payroll.

#### `payroll_period`
Payroll cutoff windows. Usually bi-weekly or monthly.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `label` | text | Human-readable (e.g., "June 1–15, 2025") |
| `dateFrom` | date | Period start (inclusive) |
| `dateTo` | date | Period end (inclusive) |
| `status` | enum | 'draft' → 'processed' → 'released' |
| `createdBy` | uuid FK | References `user.id` (nullable, HR who created) |
| `createdAt` | timestamp | When period was created in system |

**Workflow:**
1. HR creates period in 'draft' (no payslips generated)
2. HR clicks "Process" → status → 'processed', triggers payslip generation
3. HR approves and "Release" → status → 'released', employees can view

**Constraint:** `(dateFrom, dateTo)` should not overlap.

#### `payslip`
Generated pay records for each employee per period.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `employeeId` | uuid FK | References `employee.id` |
| `periodId` | uuid FK | References `payroll_period.id` |
| `basicPay` | numeric(12,2) | Base salary for period (may be prorated) |
| `allowances` | numeric(12,2) | Bonus, travel, meals, etc. (default: 0) |
| `grossPay` | numeric(12,2) | basicPay + allowances |
| `sss` | numeric(10,2) | SSS contribution deduction |
| `philhealth` | numeric(10,2) | PhilHealth deduction |
| `pagibig` | numeric(10,2) | Pag-IBIG deduction |
| `withholdingTax` | numeric(10,2) | BIR income tax |
| `netPay` | numeric(12,2) | grossPay - (sss + philhealth + pagibig + tax) |
| `status` | enum | 'pending' \| 'approved' \| 'paid' |
| `createdAt` | timestamp | When payslip was generated |

**Calculation logic:** See `/lib/payroll-calc.ts`

**Constraints:**
- Unique `(employeeId, periodId)` — one payslip per employee per period
- `status` workflow: pending → approved → paid
- All numeric fields should be `>= 0`

---

### Feedback Domain

#### `feedback`
Employee satisfaction ratings on payroll periods.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `employeeId` | uuid FK | References `employee.id` ON DELETE CASCADE |
| `periodId` | uuid FK | References `payroll_period.id` ON DELETE CASCADE |
| `rating` | integer | 1–5 stars (1=poor, 5=excellent) |
| `comment` | text | Optional qualitative feedback (max 1000 chars) |
| `createdAt` | timestamp | When feedback was submitted |

**Constraints:**
- Unique `(employeeId, periodId)` — one feedback per employee per payroll period
- `rating` in range [1, 5]

**Design rationale:** Feedback is associated with a payroll period, so admin can track satisfaction trends over time and correlate with payroll issues.

---

## ERD (Entity-Relationship Diagram)

```
                    ┌─────────────┐
                    │    user     │
                    ├─────────────┤
                    │ id (PK)     │◄─────┐
                    │ email       │      │
                    │ name        │      │
                    │ role        │      │
                    └─────────────┘      │
                         ▲ │            │
                         │ └─────────────┼───────────────────┐
                    ┌────┘              │                   │
         ┌──────────┴────┬──────────┐   │              ┌────┴──────────┐
         │               │          │   │              │               │
    ┌────────────┐  ┌─────────┐  ┌──────────┐  ┌────────────────┐  ┌────────────┐
    │  account   │  │ session │  │ employee │  │  employee (FK) │  │ payroll_period
    └────────────┘  └─────────┘  ├──────────┤  └────────────────┘  └────────────┘
                                  │ userId   │
                                  │ empNo    │
                                  │ dept     │
                                  │ salary   │
                                  └───┬──────┘
                                      │
                        ┌─────────────┴─────────────┐
                        │                           │
                    ┌───────────┐           ┌──────────────┐
                    │ payslip   │           │   feedback   │
                    ├───────────┤           ├──────────────┤
                    │ empId (FK)│───┐   ┌──│ empId (FK)   │
                    │ periodId  │───┼──┐│  │ periodId (FK)│
                    │ netPay    │   │  └┤──│ rating       │
                    │ status    │   │   └──│ comment      │
                    └───────────┘   │      └──────────────┘
                                    │
                          ┌─────────┴─────────┐
                          │ payroll_period    │
                          ├───────────────────┤
                          │ id (PK)           │
                          │ label             │
                          │ dateFrom/dateTo   │
                          │ status            │
                          └───────────────────┘
```

---

## Indexing Strategy

For performance, ensure these indexes exist:

```sql
-- Foreign keys (auto-indexed in most DBs)
CREATE INDEX idx_employee_user_id ON employee(user_id);
CREATE INDEX idx_payslip_employee_id ON payslip(employee_id);
CREATE INDEX idx_payslip_period_id ON payslip(period_id);
CREATE INDEX idx_feedback_employee_id ON feedback(employee_id);
CREATE INDEX idx_feedback_period_id ON feedback(period_id);
CREATE INDEX idx_session_user_id ON session(user_id);
CREATE INDEX idx_account_user_id ON account(user_id);

-- Lookups
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_employee_employee_no ON employee(employee_no);
CREATE INDEX idx_payroll_period_date_range ON payroll_period(date_from, date_to);

-- Composite for uniqueness/queries
CREATE UNIQUE INDEX idx_payslip_unique ON payslip(employee_id, period_id);
CREATE UNIQUE INDEX idx_feedback_unique ON feedback(employee_id, period_id);
CREATE UNIQUE INDEX idx_account_unique ON account(account_id, provider_id);

-- For sorting/filtering
CREATE INDEX idx_payslip_status ON payslip(status);
CREATE INDEX idx_payroll_period_status ON payroll_period(status);
```

Drizzle Kit manages these automatically if defined in schema.

---

## Common Queries

### List all employees with their latest payslip
```typescript
const results = await db.query.employees.findMany({
  with: {
    payslips: {
      orderBy: desc(payslips.createdAt),
      limit: 1,
    }
  }
})
```

### Get feedback summary for a payroll period
```typescript
const summary = await db.select({
  periodId: feedback.periodId,
  avgRating: avg(feedback.rating),
  totalResponses: count(feedback.id),
}).from(feedback)
  .where(eq(feedback.periodId, periodIdHere))
  .groupBy(feedback.periodId)
```

### Find employees hired in last 90 days
```typescript
const recent = await db.select().from(employees)
  .where(gte(employees.hiredAt, sql`now() - interval '90 days'`))
```

### Get all pending payslips for a period
```typescript
const pending = await db.select().from(payslips)
  .where(
    and(
      eq(payslips.periodId, periodId),
      eq(payslips.status, "pending")
    )
  )
```

### Check if feedback already submitted for period
```typescript
const [existing] = await db.select().from(feedback)
  .where(
    and(
      eq(feedback.employeeId, empId),
      eq(feedback.periodId, periodId)
    )
  )

if (existing) throw new Error("Feedback already submitted")
```

---

## Data Integrity

### Foreign Key Cascades
- Delete user → delete employee, sessions, accounts (cascades)
- Delete employee → delete payslips, feedback (cascades)
- Delete payroll_period → delete payslips, feedback (cascades)

### Constraints
- Email is unique and case-insensitive
- Employee number is unique
- No duplicate feedback per (employee, period)
- No duplicate payslip per (employee, period)

### Data Migration (PH Payroll Setup)
On first deployment:
1. Create admin user
2. Import employee roster (batch insert)
3. Create payroll periods
4. Optionally seed test data

Script example in `scripts/seed.ts` (optional).

---

## Monitoring & Maintenance

- **Dead sessions:** Delete rows where `expiresAt < now()`
- **Verification cleanup:** Delete rows where `expiresAt < now()`
- **Payslip audits:** Verify sum of deductions = SUM(sss + philhealth + pagibig + tax)
- **Backup schedule:** Supabase auto-backs up daily; retain 7-day history

---

## Migration Workflow

**Local development:**
```bash
# After schema changes in lib/db/schema.ts:
npx drizzle-kit generate  # Creates migration SQL
npx drizzle-kit push      # Applies to local Supabase
```

**Production (Supabase):**
```bash
# Same commands run in CI/CD pipeline
npx drizzle-kit generate
npx drizzle-kit push
# Or for manual control:
npx drizzle-kit migrate
```

Always test migrations on a staging copy of production data before applying to live DB.
