# Philippine Payroll Calculations

This document covers SSS, PhilHealth, Pag-IBIG, and BIR withholding tax calculations for the PH context.

**Note:** Rates and brackets change annually (usually January). Update `/lib/payroll-calc.ts` each year.

---

## Rate Tables (2024)

**Important:** These are example rates. Verify current rates on official agency websites before going live.

### SSS (Social Security System)

Contribution rates for employees (monthly):

| Monthly Salary Range | Employee Rate | Notes |
|---|---|---|
| ₱13,500 – ₱16,999 | 1.37% | Min contribution: ₱185 |
| ₱17,000 – ₱20,499 | 1.46% | |
| ₱20,500 – ₱23,999 | 1.55% | |
| ₱24,000 – ₱27,499 | 1.64% | |
| ₱27,500 – ₱30,999 | 1.73% | |
| ₱31,000 – ₱34,499 | 1.82% | |
| ₱34,500+ | 1.91% | Max contribution: ₱1,725 |

**Employer also contributes:** Employer rate = 10.4% (not deducted from employee salary)

**Calculation:**
```
SSS = salary × employee_rate
if (salary < ₱13,500) SSS = 0
if (SSS < ₱185) SSS = ₱185
if (SSS > ₱1,725) SSS = ₱1,725
```

### PhilHealth

Monthly contribution rate for employees:

| Effective Year | Rate | Notes |
|---|---|---|
| 2024–2025 | 2.75% (half) | Employee pays 2.75%, employer pays 2.75% |
| | | Monthly minimum: ₱250 |
| | | Monthly maximum: ₱2,750 |

**Calculation:**
```
PhilHealth = salary × 0.0275
if (PhilHealth < ₱250) PhilHealth = ₱250
if (PhilHealth > ₱2,750) PhilHealth = ₱2,750
```

### Pag-IBIG (Home Development Mutual Fund)

Monthly contribution rates:

| Salary Range | Employee Rate | Notes |
|---|---|---|
| ₱1,500 – ₱4,999 | 1% | Min: ₱25 |
| ₱5,000 – ₱9,999 | 1% | |
| ₱10,000+ | 2% | Max: ₱200 |

**Calculation:**
```
if (salary < ₱1,500):
  Pag-IBIG = 0
else if (salary < ₱10,000):
  Pag-IBIG = max(salary × 0.01, ₱25)
else:
  Pag-IBIG = min(salary × 0.02, ₱200)
```

### BIR Withholding Tax (Income Tax)

Monthly withholding tax brackets (2024):

| Monthly Taxable Income | Tax Rate | Notes |
|---|---|---|
| Up to ₱20,832 | 0% | Tax-free threshold |
| ₱20,833 – ₱33,333 | 5% | (amount over ₱20,832) × 5% |
| ₱33,334 – ₱66,667 | 10% | ₱625 + (amount over ₱33,333) × 10% |
| ₱66,668 – ₱166,667 | 15% | ₱3,958.33 + (amount over ₱66,667) × 15% |
| ₱166,668+ | 20% | ₱18,958.33 + (amount over ₱166,667) × 20% |

**Note:** These brackets apply to taxable income (gross pay minus deductions). Verify current BIR rates.

**Calculation:**
```
taxable_income = gross_pay - (sss + philhealth + pagibig)

if (taxable_income <= ₱20,832):
  tax = 0
else if (taxable_income <= ₱33,333):
  tax = (taxable_income - ₱20,832) × 0.05
else if (taxable_income <= ₱66,667):
  tax = ₱625 + (taxable_income - ₱33,333) × 0.10
else if (taxable_income <= ₱166,667):
  tax = ₱3,958.33 + (taxable_income - ₱66,667) × 0.15
else:
  tax = ₱18,958.33 + (taxable_income - ₱166,667) × 0.20
```

---

## Implementation

### `/lib/payroll-calc.ts`

```typescript
export interface PayrollInput {
  basicSalary: number // Monthly salary
  allowances?: number // Bonuses, meal allowance, etc.
  daysWorked?: number // For prorated calculations (default: 22 working days)
  deductionOverrides?: {
    sss?: number
    philhealth?: number
    pagibig?: number
  }
}

export interface PayrollOutput {
  basicPay: number
  allowances: number
  grossPay: number
  sss: number
  philhealth: number
  pagibig: number
  withholdingTax: number
  netPay: number
}

// SSS contribution matrix
const SSS_RATES: Array<{ min: number; max: number; rate: number }> = [
  { min: 13500, max: 16999, rate: 0.0137 },
  { min: 17000, max: 20499, rate: 0.0146 },
  { min: 20500, max: 23999, rate: 0.0155 },
  { min: 24000, max: 27499, rate: 0.0164 },
  { min: 27500, max: 30999, rate: 0.0173 },
  { min: 31000, max: 34499, rate: 0.0182 },
  { min: 34500, max: Infinity, rate: 0.0191 },
]

const SSS_MIN = 185
const SSS_MAX = 1725

const PHILHEALTH_RATE = 0.0275
const PHILHEALTH_MIN = 250
const PHILHEALTH_MAX = 2750

const PAGIBIG_RATE_LOW = 0.01
const PAGIBIG_RATE_HIGH = 0.02
const PAGIBIG_MIN = 25
const PAGIBIG_MAX = 200

// BIR Tax brackets
interface TaxBracket {
  ceiling: number
  baseAmount: number
  rate: number
  threshold: number
}

const TAX_BRACKETS: TaxBracket[] = [
  { ceiling: 20832, baseAmount: 0, rate: 0, threshold: 0 },
  { ceiling: 33333, baseAmount: 0, rate: 0.05, threshold: 20832 },
  { ceiling: 66667, baseAmount: 625, rate: 0.10, threshold: 33333 },
  { ceiling: 166667, baseAmount: 3958.33, rate: 0.15, threshold: 66667 },
  { ceiling: Infinity, baseAmount: 18958.33, rate: 0.20, threshold: 166667 },
]

export function calculateSSS(salary: number): number {
  if (salary < 13500) return 0

  const bracket = SSS_RATES.find(b => salary >= b.min && salary <= b.max)
  if (!bracket) return 0

  let sss = salary * bracket.rate
  sss = Math.max(sss, SSS_MIN)
  sss = Math.min(sss, SSS_MAX)

  return Math.round(sss * 100) / 100
}

export function calculatePhilHealth(salary: number): number {
  let philhealth = salary * PHILHEALTH_RATE
  philhealth = Math.max(philhealth, PHILHEALTH_MIN)
  philhealth = Math.min(philhealth, PHILHEALTH_MAX)

  return Math.round(philhealth * 100) / 100
}

export function calculatePagIbig(salary: number): number {
  if (salary < 1500) return 0

  let pagibig: number

  if (salary < 10000) {
    pagibig = Math.max(salary * PAGIBIG_RATE_LOW, PAGIBIG_MIN)
  } else {
    pagibig = Math.min(salary * PAGIBIG_RATE_HIGH, PAGIBIG_MAX)
  }

  return Math.round(pagibig * 100) / 100
}

export function calculateWithholdingTax(
  grossPay: number,
  sss: number,
  philhealth: number,
  pagibig: number
): number {
  // Taxable income = gross - mandatory deductions
  const taxable = grossPay - (sss + philhealth + pagibig)

  if (taxable <= 0) return 0

  const bracket = TAX_BRACKETS.find(b => taxable <= b.ceiling)
  if (!bracket) return 0

  if (bracket.rate === 0) return 0 // Tax-free range

  const tax = bracket.baseAmount + (taxable - bracket.threshold) * bracket.rate
  return Math.round(tax * 100) / 100
}

export function calculatePayroll(input: PayrollInput): PayrollOutput {
  const {
    basicSalary,
    allowances = 0,
    daysWorked = 22,
    deductionOverrides = {},
  } = input

  // Pro-rate if not full month
  const basicPay = (basicSalary / 22) * Math.min(daysWorked, 22)

  // Gross pay
  const grossPay = Math.round((basicPay + allowances) * 100) / 100

  // Calculate deductions (or use overrides)
  const sss = deductionOverrides.sss ?? calculateSSS(grossPay)
  const philhealth = deductionOverrides.philhealth ?? calculatePhilHealth(grossPay)
  const pagibig = deductionOverrides.pagibig ?? calculatePagIbig(grossPay)
  const withholdingTax = calculateWithholdingTax(grossPay, sss, philhealth, pagibig)

  // Net pay
  const netPay = Math.round((grossPay - (sss + philhealth + pagibig + withholdingTax)) * 100) / 100

  return {
    basicPay: Math.round(basicPay * 100) / 100,
    allowances: Math.round(allowances * 100) / 100,
    grossPay,
    sss,
    philhealth,
    pagibig,
    withholdingTax,
    netPay,
  }
}
```

---

## Usage in Payroll Processing

### Automatic Payslip Generation

When HR clicks "Process" on a payroll period:

```typescript
// server/routes/payroll.ts
router.patch("/:id", requireRole("admin", "hr"), async (c) => {
  const periodId = c.req.param("id")
  const { status } = c.req.valid("json")

  if (status === "processed") {
    // Fetch all active employees
    const allEmps = await db.query.employees.findMany()

    // Calculate and generate payslips
    for (const emp of allEmps) {
      const calc = calculatePayroll({
        basicSalary: emp.basicSalary,
        allowances: 0, // Could pull from emp.allowances if stored
        daysWorked: 22, // Full month assumed
      })

      // Insert payslip
      await db.insert(payslips).values({
        employeeId: emp.id,
        periodId,
        basicPay: calc.basicPay,
        allowances: calc.allowances,
        grossPay: calc.grossPay,
        sss: calc.sss,
        philhealth: calc.philhealth,
        pagibig: calc.pagibig,
        withholdingTax: calc.withholdingTax,
        netPay: calc.netPay,
        status: "pending",
      })
    }

    // Update period status
    await db.update(payrollPeriods).set({ status: "processed" }).where(eq(payrollPeriods.id, periodId))
  }

  return c.json({ success: true })
})
```

---

## Payslip Display Format

Example payslip layout for PDF or print:

```
╔════════════════════════════════════════════╗
║         PAYROLL STATEMENT                  ║
║     Company Name | May 1–15, 2025          ║
╚════════════════════════════════════════════╝

Employee: John Doe
Emp No: EMP-001
Position: Developer
Department: IT

EARNINGS:
  Basic Pay              ₱ 25,000.00
  Allowances             ₱      0.00
  ─────────────────────────────────
  Gross Pay              ₱ 25,000.00

DEDUCTIONS:
  SSS                    ₱    479.75
  PhilHealth             ₱    687.50
  Pag-IBIG               ₱    500.00
  Withholding Tax        ₱    661.55
  ─────────────────────────────────
  Total Deductions       ₱  2,328.80

═════════════════════════════════════════════
  NET PAY                ₱ 22,671.20
═════════════════════════════════════════════

Issued: May 28, 2025 | Valid only with official company seal
```

---

## Special Cases

### Leave Without Pay (LWP)

If employee took unpaid leave:

```typescript
const daysWorked = 22 - 3 // 3 days LWP
const calc = calculatePayroll({
  basicSalary: 25000,
  daysWorked,
})
// basicPay = (25000 / 22) × 19 ≈ ₱21,590.91
```

### 13th Month Bonus

Typically ₱50,000 or 1/12 of annual salary per employee:

```typescript
const thirteenthMonth = basicAnnualSalary / 12
const calc = calculatePayroll({
  basicSalary: 0,
  allowances: thirteenthMonth,
})
```

### Loan Deductions / Other Deductions

Add to net pay calculation:

```typescript
const totalDeductions = sss + philhealth + pagibig + withholdingTax + loanDeduction + otherDeductions
const netPay = grossPay - totalDeductions
```

(Extend payslips table with `loanDeduction`, `otherDeductions` fields if needed.)

---

## Audit Trail

Log all payroll changes for compliance:

```typescript
interface PayrollLog {
  id: uuid
  periodId: uuid
  action: "created" | "modified" | "approved" | "released"
  actor: uuid // user who made change
  changes: object // what was changed
  createdAt: timestamp
}

// On payslip creation/update:
await db.insert(payrollLogs).values({
  periodId,
  action: "created",
  actor: userId,
  changes: { payslipId, basicPay, netPay },
})
```

---

## Updating Rates Annually

**Task:** Every January or when rates change:

1. Go to:
   - SSS: https://www.sss.gov.ph
   - PhilHealth: https://www.philhealth.gov.ph
   - Pag-IBIG: https://www.pagibigfundservices.com
   - BIR: https://www.bir.gov.ph

2. Update rate tables in `/lib/payroll-calc.ts`

3. Test with sample payroll

4. Deploy to production

5. Document change date in CHANGELOG

---

## Resources

- **SSS:** https://www.sss.gov.ph/sss/PortalV2/?q=contribution-schedule
- **PhilHealth:** https://www.philhealth.gov.ph/members/beneficiary-registration/contribution-rates
- **Pag-IBIG:** https://www.pagibigfundservices.com/pagibigweb/pages/contribution_schedule/contribution-schedule.html
- **BIR Tax Tables:** https://www.bir.gov.ph/index.php/tax-information/income-tax/withholding-tax.html

---

## Testing Payroll Calculations

Example test cases:

```typescript
import { calculatePayroll } from "@/lib/payroll-calc"

describe("Payroll Calculations", () => {
  test("minimum salary (₱13,500)", () => {
    const result = calculatePayroll({ basicSalary: 13500 })
    expect(result.netPay).toBeGreaterThan(0)
  })

  test("mid-range salary (₱30,000)", () => {
    const result = calculatePayroll({ basicSalary: 30000 })
    expect(result.sss).toBeDefined()
    expect(result.withholdingTax).toBeGreaterThan(0)
  })

  test("high salary (₱100,000)", () => {
    const result = calculatePayroll({ basicSalary: 100000 })
    expect(result.sss).toBe(1725) // capped
    expect(result.pagibig).toBe(200) // capped
  })

  test("pro-rated leave", () => {
    const full = calculatePayroll({ basicSalary: 22000, daysWorked: 22 })
    const prorated = calculatePayroll({ basicSalary: 22000, daysWorked: 20 })
    expect(prorated.basicPay).toBeLessThan(full.basicPay)
  })
})
```

