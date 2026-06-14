# Code Conventions & Patterns

## Naming Conventions

### Files & Directories
- **Page components:** `page.tsx` (lowercase, Next.js convention)
- **API routes:** `route.ts` (lowercase)
- **Components:** `PascalCase` (e.g., `PayslipCard.tsx`, `EmployeeForm.tsx`)
- **Utilities:** `camelCase` (e.g., `payroll-calc.ts`, `validators.ts`)
- **Hooks:** `camelCase` prefixed with `use` (e.g., `usePayslips.ts`, `useFeedback.ts`)
- **Tests:** Same as source, with `.test.ts` or `.spec.ts` suffix

### Variables & Functions
- **Database fields:** `snake_case` (follows SQL convention)
  ```typescript
  // In Drizzle schema
  basicSalary: numeric("basic_salary", ...)
  ```
- **TypeScript/JavaScript:** `camelCase`
  ```typescript
  const basicSalary = 25000
  function calculateNetPay(grossPay: number) { ... }
  ```
- **Constants:** `UPPER_SNAKE_CASE`
  ```typescript
  const MAX_FEEDBACK_LENGTH = 1000
  const SSS_MIN_CONTRIBUTION = 185
  ```
- **React Components:** `PascalCase`
  ```typescript
  export function PayslipCard({ payslip }: Props) { ... }
  ```
- **Booleans:** Prefix with `is`, `has`, `can`, `should`
  ```typescript
  const isLoading = false
  const hasError = true
  const canEdit = user.role === "admin"
  ```

### Database Identifiers
- **Tables:** Singular, snake_case
  ```typescript
  pgTable("employee", { ... })  // not "employees"
  pgTable("payroll_period", { ... })
  ```
- **Foreign keys:** `{tableName}Id` or `{tableName}_id` (in schema)
  ```typescript
  employeeId: uuid("employee_id").references(() => employees.id)
  ```
- **Timestamps:** `createdAt`, `updatedAt`, `expiresAt`
  ```typescript
  createdAt: timestamp("created_at").defaultNow()
  ```
- **Status fields:** `status` (use enum or string)
  ```typescript
  status: payslipStatusEnum("status").default("pending")
  ```

### API Routes & Query Params
- **Routes:** kebab-case
  ```
  GET  /api/employees
  POST /api/employees
  GET  /api/payroll-periods
  GET  /api/payslips/:id
  ```
- **Query params:** camelCase
  ```
  GET /api/payslips?periodId=uuid&employeeId=uuid&limit=50
  GET /api/employees?department=Finance&position=Accountant
  ```

---

## Code Organization

### Component Structure

```typescript
// components/payroll/PayslipCard.tsx

"use client" // if client-side only

import { ReactNode } from "react"
import { Payslip } from "@/lib/db/schema"

// Props interface (at top, before component)
interface PayslipCardProps {
  payslip: Payslip
  onApprove?: () => void
  children?: ReactNode
}

// Component definition (export as default for easy code-splitting)
export default function PayslipCard({
  payslip,
  onApprove,
  children,
}: PayslipCardProps) {
  // Hooks at top
  const [expanded, setExpanded] = useState(false)

  // Derived state / calculations
  const taxRate = (payslip.withholdingTax / payslip.grossPay) * 100

  // Event handlers
  const handleToggle = () => setExpanded(!expanded)

  // Render
  return (
    <div className="border rounded p-4 space-y-2">
      <h3 className="font-semibold">Payslip #{payslip.id}</h3>
      <p>Net Pay: ₱{payslip.netPay.toFixed(2)}</p>
      {expanded && (
        <div className="text-sm text-gray-600">
          <p>Gross: ₱{payslip.grossPay.toFixed(2)}</p>
          <p>Tax Rate: {taxRate.toFixed(2)}%</p>
        </div>
      )}
      <button onClick={handleToggle}>
        {expanded ? "Show less" : "Show more"}
      </button>
      {children}
    </div>
  )
}
```

### Hook Structure with TanStack Query

```typescript
// lib/hooks/usePayslips.ts
"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import { hc } from "hono/client"
import type { AppType } from "@/server"

const client = hc<AppType>("/api")

interface UsePayslipsOptions {
  periodId?: string
  employeeId?: string
}

export function usePayslips(options?: UsePayslipsOptions) {
  return useQuery({
    queryKey: ["payslips", options?.periodId, options?.employeeId],
    queryFn: async () => {
      const response = await client.payslips.$get({
        query: {
          periodId: options?.periodId,
          employeeId: options?.employeeId,
        },
      })
      return response
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Pagination variant
export function usePayslipsInfinite(options?: UsePayslipsOptions) {
  return useInfiniteQuery({
    queryKey: ["payslips-infinite", options?.periodId],
    queryFn: async ({ pageParam = 0 }) => {
      return client.payslips.$get({
        query: {
          offset: pageParam,
          limit: 10,
          ...options,
        },
      })
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === 10 ? pages.length * 10 : undefined
    },
  })
}
```

### Zod Validator Structure

```typescript
// lib/validators.ts

import { z } from "zod"

// Feedback submission schema
export const feedbackSchema = z.object({
  periodId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

export type FeedbackInput = z.infer<typeof feedbackSchema>

// Employee creation schema
export const createEmployeeSchema = z.object({
  userId: z.string().uuid(),
  employeeNo: z.string().min(3).max(20).regex(/^EMP-/),
  department: z.string().min(1),
  position: z.string().min(1),
  employmentType: z.enum(["full_time", "part_time", "contractual"]),
  basicSalary: z.number().positive(),
  hiredAt: z.string().pipe(z.coerce.date()),
})

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
```

### Hono Route Structure

```typescript
// server/routes/feedback.ts

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { feedbackSchema } from "@/lib/validators"
import { authMiddleware, requireRole } from "../middleware/auth"

export const feedbackRouter = new Hono()
  // Apply auth to all routes in this router
  .use(authMiddleware)

  // Submit feedback
  .post("/", zValidator("json", feedbackSchema), async (c) => {
    const user = c.get("user")
    const data = c.req.valid("json")

    // Fetch employee
    const [emp] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user.id))

    if (!emp) {
      return c.json({ error: "Employee record not found" }, 404)
    }

    // Check for duplicate
    const [existing] = await db
      .select()
      .from(feedback)
      .where(
        and(
          eq(feedback.employeeId, emp.id),
          eq(feedback.periodId, data.periodId)
        )
      )

    if (existing) {
      return c.json({ error: "Feedback already submitted" }, 409)
    }

    // Insert
    const [entry] = await db
      .insert(feedback)
      .values({ employeeId: emp.id, ...data })
      .returning()

    return c.json(entry, 201)
  })

  // View mine
  .get("/mine", async (c) => {
    const user = c.get("user")
    const [emp] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user.id))

    if (!emp) {
      return c.json([], 200) // No feedback if no employee record
    }

    const entries = await db
      .select()
      .from(feedback)
      .where(eq(feedback.employeeId, emp.id))
      .orderBy(desc(feedback.createdAt))

    return c.json(entries)
  })

  // Admin: list all
  .get("/", requireRole("admin", "hr"), async (c) => {
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : 50
    const offset = c.req.query("offset") ? parseInt(c.req.query("offset")!) : 0

    const entries = await db
      .select()
      .from(feedback)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(feedback.createdAt))

    return c.json(entries)
  })
```

---

## Error Handling

### API Responses

**Success:**
```typescript
return c.json({
  success: true,
  data: { ... }
}, 200)
```

**Error:**
```typescript
return c.json({
  error: "User not found",
  code: "USER_NOT_FOUND",
  details: { userId: "..." } // optional
}, 404)
```

### Try-Catch Pattern

```typescript
async function processPayroll() {
  try {
    // Business logic
    await db.transaction(async (tx) => {
      // Multiple operations in transaction
    })
    return { success: true }
  } catch (err) {
    if (err instanceof SomeCustomError) {
      // Handle custom errors
      return { error: err.message }
    }
    // Log unknown errors
    console.error("Payroll processing failed:", err)
    throw new Error("Failed to process payroll")
  }
}
```

---

## TypeScript Best Practices

### Strict Mode
Always enable in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Type Inference
```typescript
// ✓ Good: let TS infer
const user = await db.query.users.findFirst()
// type: User | undefined

// ✓ Good: explicit when needed
const salary: number = employee.basicSalary
const period: PayrollPeriod = await getPeriod()

// ✗ Avoid: unnecessary annotations
const name: string = "John" // obvious from context
```

### Union Types vs Enums
```typescript
// ✓ For database enums (limited, known values)
export const payslipStatus = pgEnum("payslip_status", [
  "pending",
  "approved",
  "paid"
])

// ✓ For validation in route
const statusSchema = z.enum(["pending", "approved", "paid"])

// ✗ Avoid: string literals everywhere
function updatePayslip(status: string) { } // too loose
```

### Nullable Fields
```typescript
interface Payslip {
  id: string
  netPay: number // required
  comment?: string // optional
  approvedAt: Date | null // nullable (can be null or date)
}
```

---

## React Best Practices

### Client vs Server Components

**Server Components (preferred for data fetching):**
```typescript
// app/(dashboard)/payslips/page.tsx
export default async function PayslipsPage() {
  const payslips = await fetch("/api/payslips").then(r => r.json())
  return <PayslipsClient initialData={payslips} />
}
```

**Client Components (for interactivity):**
```typescript
// components/PayslipsClient.tsx
"use client"
import { useQuery } from "@tanstack/react-query"

export function PayslipsClient({ initialData }) {
  const { data: payslips } = useQuery({
    queryKey: ["payslips"],
    initialData,
    queryFn: async () => {
      return client.payslips.$get()
    }
  })
  // UI logic here
}
```

### Component Props
```typescript
interface ButtonProps {
  onClick: () => void
  variant?: "primary" | "secondary" // union types
  disabled?: boolean
  children: React.ReactNode
}

// Typing children
function Card({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
```

---

## Database Query Patterns

### Selecting with Relations
```typescript
// With nested relations
const employees = await db.query.employees.findMany({
  with: {
    user: true,
    payslips: {
      where: eq(payslips.status, "paid"),
      limit: 5,
    },
  },
})
```

### Filtering & Sorting
```typescript
const payslips = await db
  .select()
  .from(payslips)
  .where(
    and(
      eq(payslips.periodId, periodId),
      gte(payslips.netPay, 20000),
      or(
        eq(payslips.status, "pending"),
        eq(payslips.status, "approved")
      )
    )
  )
  .orderBy(desc(payslips.netPay))
  .limit(10)
  .offset(0)
```

### Aggregations
```typescript
const stats = await db
  .select({
    periodId: payslips.periodId,
    count: count(payslips.id),
    avgNetPay: avg(payslips.netPay),
    totalNetPay: sum(payslips.netPay),
  })
  .from(payslips)
  .groupBy(payslips.periodId)
  .having(gt(count(payslips.id), 0))
```

### Transactions
```typescript
await db.transaction(async (tx) => {
  // All operations use tx, all succeed or all fail
  await tx.insert(payslip).values(...)
  await tx.update(period).set({ status: "processed" })
  // If any fails, entire transaction rolls back
})
```

---

## Testing Patterns

### Component Tests
```typescript
// components/__tests__/PayslipCard.test.tsx
import { render, screen } from "@testing-library/react"
import PayslipCard from "../PayslipCard"

describe("PayslipCard", () => {
  it("renders payslip amount", () => {
    const payslip = { id: "1", netPay: 25000, status: "paid" }
    render(<PayslipCard payslip={payslip} />)
    expect(screen.getByText(/25000/)).toBeInTheDocument()
  })
})
```

### API Endpoint Tests
```typescript
// server/routes/__tests__/feedback.test.ts
describe("Feedback API", () => {
  it("submits feedback for payroll period", async () => {
    // Mock auth context
    const app = feedbackRouter
    const response = await app.request(
      new Request("http://localhost/", {
        method: "POST",
        body: JSON.stringify({
          periodId: "uuid",
          rating: 5,
          comment: "Great payroll"
        }),
        headers: { "Content-Type": "application/json" }
      })
    )
    expect(response.status).toBe(201)
  })
})
```

---

## Documentation

### JSDoc Comments
```typescript
/**
 * Calculate net pay for an employee.
 * 
 * @param salary - Monthly salary in PHP
 * @param daysWorked - Number of days worked (default: 22)
 * @returns PayrollOutput with all deductions and net pay
 * 
 * @example
 * const result = calculatePayroll({ basicSalary: 25000 })
 * console.log(result.netPay) // ₱22,671.20
 */
export function calculatePayroll(input: PayrollInput): PayrollOutput {
  // ...
}
```

### Inline Comments
```typescript
// Keep comments meaningful, avoid obvious statements

// ✓ Why, not what
// SSS is capped at ₱1,725/month per 2024 regulations
const sss = Math.min(calculated, 1725)

// ✗ Obvious (don't do this)
// Set sss to the minimum of calculated and 1725
```

---

## Import/Export Organization

```typescript
// Preferred order in files:
// 1. External libraries
import { Hono } from "hono"
import { eq, desc } from "drizzle-orm"

// 2. Internal utilities & types
import { db } from "@/lib/db"
import { authMiddleware } from "../middleware/auth"

// 3. Database & schemas
import { payslips, employees } from "@/lib/db/schema"

// 4. Validation schemas
import { feedbackSchema } from "@/lib/validators"

// Export types separately from implementations
export type PayslipWithEmployee = Payslip & { employee: Employee }
export function getPayslips() { ... }
```

---

## Commit Messages

Follow Conventional Commits:

```
feat: add feedback system
fix: correct SSS calculation for high earners
refactor: extract payroll logic to separate file
docs: update payroll calculation guide
test: add payslip calculation tests
chore: update dependencies
```

---

## Code Review Checklist

- [ ] Types are inferred or explicitly declared
- [ ] No `any` types (unless absolutely necessary)
- [ ] Error handling is present (try-catch or error response)
- [ ] Database queries are optimized (no N+1, indexes used)
- [ ] Components are properly split (server vs client)
- [ ] Zod schemas validate all external input
- [ ] Role checks are in place for protected routes
- [ ] Tests pass locally
- [ ] No console.log left in production code
- [ ] JSDoc for public functions

