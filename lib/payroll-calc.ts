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

export function calculatePhilHealth(
  salary: number,
  rate: number = PHILHEALTH_RATE,
): number {
  const raw = salary * rate
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

// ---------------------------------------------------------------------------
// Absence-driven payroll engine
// ---------------------------------------------------------------------------
//
// Teaching/school staff are monthly-paid: every scheduled school day is
// assumed worked unless HR logs an explicit absence or an approved leave
// request covers it. There is no punch clock, so there's no late/rest-day/
// holiday premium math here — monthly-paid employees already have those
// folded into their basic salary under PH labor practice.

// Which half of the month a payroll period falls in. Statutory contributions
// are withheld on one cutoff or the other, not split across both.
export type Cutoff = "first" | "second"
export type ContributionCutoff = Cutoff | "every"
export type ContributionMode = "statutory" | "flat"
export type DailyRateBasis = "monthly" | "period"

// Semi-monthly payroll: the monthly basic salary is paid over two cutoffs.
const CUTOFFS_PER_MONTH = 2

export interface PayrollSettingsInput {
  workingDaysPerMonth: number
  workDays: string[] // school week, e.g. ["mon", ..., "fri"]
  thirteenthMonthEveryCutoff: boolean
  sssEnabled: boolean
  philhealthEnabled: boolean
  pagibigEnabled: boolean
  taxEnabled: boolean
  philhealthRate: number
  // Paid-leave day valuation: flat amount, or the daily rate ("actual rate").
  leaveAmount: number
  leaveActualRate: boolean
  // Daily Time Record (DTR) / lateness deduction configuration.
  standardTimeIn: string // "HH:MM"
  standardTimeOut: string // "HH:MM"
  lateGracePeriodMinutes: number
  lateDeductionEnabled: boolean
  // Absence/late deduction basis — see `dailyRateBasisEnum` in the schema.
  dailyRateBasis: DailyRateBasis
  // Flat-amount contribution configuration (used when mode is "flat").
  contributionMode: ContributionMode
  sssAmount: number
  philhealthAmount: number
  pagibigAmount: number
  sssCutoff: ContributionCutoff
  philhealthCutoff: ContributionCutoff
  pagibigCutoff: ContributionCutoff
}

export interface AbsenceAggregate {
  scheduledDays: number
  daysPresent: number
  unpaidAbsenceDays: number
  paidLeaveDays: number
  unpaidLeaveDays: number
}

export type DayStatus = "present" | "absent" | "leave" | "off"

export interface DayBreakdown {
  date: string
  scheduled: boolean
  status: DayStatus
}

const DOW_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// Leave types that are paid (count toward basic pay) vs. unpaid leave, which
// excuses the absence without paying for the day.
export const PAID_LEAVE_TYPES = new Set(["vacation", "sick", "emergency"])

export function isLeavePaid(type: string): boolean {
  return PAID_LEAVE_TYPES.has(type)
}

export interface AggregateAbsencesParams {
  dateFrom: string
  dateTo: string
  workDays: string[]
  // Dates HR has logged as an unauthorized/unplanned absence.
  absenceDates: string[]
  // Approved leave dates within the period, each flagged paid/unpaid.
  leaves?: { date: string; paid: boolean }[]
}

// Walks a payroll period's calendar against the school week, logged absences,
// and approved leave to produce day totals for the payroll engine and a
// per-day breakdown for the attendance summary view.
export function aggregateAbsences(
  params: AggregateAbsencesParams,
): { aggregate: AbsenceAggregate; days: DayBreakdown[] } {
  const { dateFrom, dateTo, workDays, absenceDates, leaves = [] } = params
  const absenceSet = new Set(absenceDates)
  const leaveByDate = new Map(leaves.map((l) => [l.date, l.paid]))

  const agg: AbsenceAggregate = {
    scheduledDays: 0,
    daysPresent: 0,
    unpaidAbsenceDays: 0,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
  }
  const days: DayBreakdown[] = []

  const end = parseDateKey(dateTo)
  for (
    let cursor = parseDateKey(dateFrom);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const key = dateKey(cursor)
    const dow = DOW_KEYS[cursor.getDay()]
    const scheduled = workDays.includes(dow)

    let status: DayStatus = "off"

    if (scheduled) {
      agg.scheduledDays += 1
      if (leaveByDate.has(key)) {
        if (leaveByDate.get(key)) {
          agg.paidLeaveDays += 1
        } else {
          agg.unpaidLeaveDays += 1
        }
        status = "leave"
      } else if (absenceSet.has(key)) {
        agg.unpaidAbsenceDays += 1
        status = "absent"
      } else {
        agg.daysPresent += 1
        status = "present"
      }
    }

    days.push({ date: key, scheduled, status })
  }

  agg.daysPresent = round2(agg.daysPresent)
  agg.paidLeaveDays = round2(agg.paidLeaveDays)

  return { aggregate: agg, days }
}

function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

// A DTR (Daily Time Record) time-in row, as read from `timeLogs`.
export interface TimeLogRow {
  date: string
  timeIn: string | Date | null
}

// Sums minutes late (time-in minus standard shift start, minus a grace
// period) across a period's time logs. Missing time-in on a scheduled day is
// not counted here — that's covered by the absence/leave aggregate instead.
export function aggregateLateMinutes(params: {
  timeLogs: TimeLogRow[]
  standardTimeIn: string
  gracePeriodMinutes: number
}): number {
  const { timeLogs, standardTimeIn, gracePeriodMinutes } = params
  const cutoff = parseHHMM(standardTimeIn) + gracePeriodMinutes

  let total = 0
  for (const log of timeLogs) {
    if (!log.timeIn) continue
    const d = typeof log.timeIn === "string" ? new Date(log.timeIn) : log.timeIn
    const minutesOfDay = d.getHours() * 60 + d.getMinutes()
    if (minutesOfDay > cutoff) {
      total += minutesOfDay - cutoff
    }
  }
  return total
}

// Classifies a payroll period by its end date: periods ending on or before
// the 15th are the first cutoff, the rest are the second.
export function cutoffOf(dateTo: string): Cutoff {
  const day = Number(dateTo.split("-")[2])
  return day <= 15 ? "first" : "second"
}

function withheldThisCutoff(
  schedule: ContributionCutoff,
  cutoff: Cutoff,
): boolean {
  return schedule === "every" || schedule === cutoff
}

export interface AbsencePayrollInput {
  basicSalary: number
  allowance?: number
  settings: PayrollSettingsInput
  absence: AbsenceAggregate
  // Which half of the month this period covers; drives which statutory
  // contributions are withheld. Defaults to withholding all of them.
  cutoff?: Cutoff
  lateMinutes?: number
  deductToggles?: {
    sss?: boolean
    philhealth?: boolean
    pagibig?: boolean
    tax?: boolean
  }
  loanDeduction?: number
}

export interface AbsencePayrollOutput {
  basicPay: number
  allowances: number
  grossPay: number
  sss: number
  philhealth: number
  pagibig: number
  withholdingTax: number
  loanDeduction: number
  thirteenthMonthPay: number
  lateMinutes: number
  lateDeduction: number
  netPay: number
  daysWorked: number
  // Rate the absence/late deductions were derived from, for payslip display.
  dailyRate: number
}

export function calculatePayrollFromAbsences(
  input: AbsencePayrollInput,
): AbsencePayrollOutput {
  const {
    basicSalary,
    allowance = 0,
    settings,
    absence: a,
    cutoff,
    lateMinutes = 0,
    deductToggles = {},
    loanDeduction = 0,
  } = input

  // Base pay for this cutoff — the monthly salary split across the month's
  // cutoffs. Under the "period" basis the daily rate divides that base by the
  // days actually scheduled in this cutoff, so a short cutoff has a higher
  // daily rate than a long one.
  const cutoffBase = basicSalary / CUTOFFS_PER_MONTH
  const dailyRate =
    settings.dailyRateBasis === "period"
      ? a.scheduledDays > 0
        ? cutoffBase / a.scheduledDays
        : 0
      : basicSalary / settings.workingDaysPerMonth

  // Per-minute rate derived from the standard shift length; used only for
  // the lateness deduction, not for OT/rest-day/holiday premiums (out of
  // scope — those are folded into basic salary under PH labor practice).
  const shiftMinutes = Math.max(
    parseHHMM(settings.standardTimeOut) - parseHHMM(settings.standardTimeIn),
    1,
  )
  const perMinuteRate = dailyRate / shiftMinutes
  const lateDeduction = settings.lateDeductionEnabled
    ? round2(lateMinutes * perMinuteRate)
    : 0

  // Paid leave is valued at the daily rate (actual) or a flat per-day amount.
  const leavePerDay = settings.leaveActualRate ? dailyRate : settings.leaveAmount
  const basicPay = round2(
    dailyRate * a.daysPresent + leavePerDay * a.paidLeaveDays,
  )
  const grossPay = round2(basicPay + allowance)

  // Statutory contributions are based on monthly basic salary (PH practice),
  // gated by the per-employee toggle, the system-wide setting, and — in flat
  // mode — the cutoff each contribution is scheduled to be withheld on.
  const flat = settings.contributionMode === "flat"
  const dueThisCutoff = (schedule: ContributionCutoff) =>
    !flat || cutoff === undefined || withheldThisCutoff(schedule, cutoff)

  const sss =
    settings.sssEnabled && deductToggles.sss !== false && dueThisCutoff(settings.sssCutoff)
      ? flat
        ? round2(settings.sssAmount)
        : calculateSSS(basicSalary)
      : 0
  const philhealth =
    settings.philhealthEnabled &&
    deductToggles.philhealth !== false &&
    dueThisCutoff(settings.philhealthCutoff)
      ? flat
        ? round2(settings.philhealthAmount)
        : calculatePhilHealth(basicSalary, settings.philhealthRate)
      : 0
  const pagibig =
    settings.pagibigEnabled &&
    deductToggles.pagibig !== false &&
    dueThisCutoff(settings.pagibigCutoff)
      ? flat
        ? round2(settings.pagibigAmount)
        : calculatePagIbig(basicSalary)
      : 0
  const withholdingTax =
    settings.taxEnabled && deductToggles.tax !== false
      ? calculateWithholdingTax(grossPay, sss, philhealth, pagibig)
      : 0

  // 13th-month accrual when configured to release every cut-off (1/12 of basic).
  const thirteenthMonthPay = settings.thirteenthMonthEveryCutoff
    ? round2(basicPay / 12)
    : 0

  const netPay = round2(
    grossPay -
      (sss + philhealth + pagibig + withholdingTax + loanDeduction + lateDeduction) +
      thirteenthMonthPay,
  )

  return {
    basicPay,
    allowances: round2(allowance),
    grossPay,
    sss,
    philhealth,
    pagibig,
    withholdingTax,
    loanDeduction: round2(loanDeduction),
    thirteenthMonthPay,
    lateMinutes,
    lateDeduction,
    netPay,
    daysWorked: round2(a.daysPresent + a.paidLeaveDays),
    dailyRate: round2(dailyRate),
  }
}

// ---------------------------------------------------------------------------
// Payroll leakage reconciliation
// ---------------------------------------------------------------------------
//
// Compares the system-computed `netPay` against the amount the releasing
// staff reports as actually handed out (`actualNetPay`, captured when a
// payslip is marked "paid"). This is a reconciliation control, not a fraud
// proof: the actual amount is self-reported by whoever releases the pay.

export interface LeakageInput {
  netPay: number
  actualNetPay: number | null
}

export type LeakageStatus = "overpayment" | "underpayment" | "ok" | "unreleased"

export interface LeakageResult {
  leakage: number | null
  status: LeakageStatus
}

export function computeLeakage(input: LeakageInput): LeakageResult {
  const { netPay, actualNetPay } = input
  if (actualNetPay === null) return { leakage: null, status: "unreleased" }

  const leakage = round2(actualNetPay - netPay)
  const status: LeakageStatus =
    leakage > 0 ? "overpayment" : leakage < 0 ? "underpayment" : "ok"
  return { leakage, status }
}
