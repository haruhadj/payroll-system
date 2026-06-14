export interface PayrollInput {
  basicSalary: number
  allowances?: number
  daysWorked?: number
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

// SSS contribution brackets (2024)
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

// PhilHealth (2024-2025): employee pays 2.75% of monthly salary
const PHILHEALTH_RATE = 0.0275
const PHILHEALTH_MIN = 250
const PHILHEALTH_MAX = 2750

// Pag-IBIG
const PAGIBIG_RATE_LOW = 0.01
const PAGIBIG_RATE_HIGH = 0.02
const PAGIBIG_MIN = 25
const PAGIBIG_MAX = 200

// BIR monthly withholding tax brackets (2024 TRAIN Law)
interface TaxBracket {
  ceiling: number
  baseAmount: number
  rate: number
  threshold: number
}

const TAX_BRACKETS: TaxBracket[] = [
  { ceiling: 20832, baseAmount: 0, rate: 0, threshold: 0 },
  { ceiling: 33333, baseAmount: 0, rate: 0.05, threshold: 20832 },
  { ceiling: 66667, baseAmount: 625, rate: 0.1, threshold: 33333 },
  { ceiling: 166667, baseAmount: 3958.33, rate: 0.15, threshold: 66667 },
  { ceiling: Infinity, baseAmount: 18958.33, rate: 0.2, threshold: 166667 },
]

export function calculateSSS(salary: number): number {
  if (salary < 13500) return 0
  const bracket = SSS_RATES.find((b) => salary >= b.min && salary <= b.max)
  if (!bracket) return 0
  const raw = salary * bracket.rate
  return round2(Math.min(Math.max(raw, SSS_MIN), SSS_MAX))
}

export function calculatePhilHealth(salary: number): number {
  const raw = salary * PHILHEALTH_RATE
  return round2(Math.min(Math.max(raw, PHILHEALTH_MIN), PHILHEALTH_MAX))
}

export function calculatePagIbig(salary: number): number {
  if (salary < 1500) return 0
  if (salary < 10000) {
    return round2(Math.max(salary * PAGIBIG_RATE_LOW, PAGIBIG_MIN))
  }
  return round2(Math.min(salary * PAGIBIG_RATE_HIGH, PAGIBIG_MAX))
}

export function calculateWithholdingTax(
  grossPay: number,
  sss: number,
  philhealth: number,
  pagibig: number,
): number {
  const taxable = grossPay - (sss + philhealth + pagibig)
  if (taxable <= 0) return 0
  const bracket = TAX_BRACKETS.find((b) => taxable <= b.ceiling)
  if (!bracket || bracket.rate === 0) return 0
  return round2(bracket.baseAmount + (taxable - bracket.threshold) * bracket.rate)
}

export function calculatePayroll(input: PayrollInput): PayrollOutput {
  const { basicSalary, allowances = 0, daysWorked = 22, deductionOverrides = {} } = input

  const basicPay = round2((basicSalary / 22) * Math.min(daysWorked, 22))
  const grossPay = round2(basicPay + allowances)

  const sss = deductionOverrides.sss ?? calculateSSS(grossPay)
  const philhealth = deductionOverrides.philhealth ?? calculatePhilHealth(grossPay)
  const pagibig = deductionOverrides.pagibig ?? calculatePagIbig(grossPay)
  const withholdingTax = calculateWithholdingTax(grossPay, sss, philhealth, pagibig)

  const netPay = round2(grossPay - (sss + philhealth + pagibig + withholdingTax))

  return {
    basicPay,
    allowances: round2(allowances),
    grossPay,
    sss,
    philhealth,
    pagibig,
    withholdingTax,
    netPay,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
