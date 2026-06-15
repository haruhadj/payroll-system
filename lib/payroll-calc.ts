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
// Attendance-driven payroll engine
// ---------------------------------------------------------------------------

export interface PayrollSettingsInput {
  otRate: number
  restDayRate: number
  restDayOtRate: number
  nightDiffRate: number
  regularHolidayRate: number
  specialHolidayRate: number
  workingDaysPerMonth: number
  workHoursPerDay: number
  lateGracePeriodMinutes: number
  nightDiffStart: string // "HH:MM"
  nightDiffEnd: string // "HH:MM"
  thirteenthMonthEveryCutoff: boolean
  sssEnabled: boolean
  philhealthEnabled: boolean
  pagibigEnabled: boolean
  taxEnabled: boolean
  philhealthRate: number
  // Flat amounts + "actual rate" toggles (actual rate ⇒ use the multiplier).
  overtimeAmount: number
  overtimeActualRate: boolean
  holidayAmount: number
  holidayActualRate: boolean
  nightDiffAmount: number
  nightDiffActualRate: boolean
  leaveAmount: number
  leaveActualRate: boolean
  lateAmountPerMinute: number
  sundayHolidayPaid: boolean
}

export interface ScheduleInput {
  timeIn: string // "HH:MM"
  timeOut: string // "HH:MM"
  breakMinutes: number
  workDays: string[] // ["mon", ..., "sun"]
  isNightShift: boolean
}

const DEFAULT_SCHEDULE: ScheduleInput = {
  timeIn: "08:00",
  timeOut: "17:00",
  breakMinutes: 60,
  workDays: ["mon", "tue", "wed", "thu", "fri"],
  isNightShift: false,
}

export interface AttendanceAggregate {
  regularDaysWorked: number
  otHours: number
  nightDiffHours: number
  restDayHours: number
  regularHolidayHours: number
  specialHolidayHours: number
  lateMinutes: number
  daysAbsent: number
  paidLeaveDays: number
}

export type DayType =
  | "regular"
  | "rest_day"
  | "regular_holiday"
  | "special_holiday"

export type DayStatus = "present" | "absent" | "rest" | "holiday" | "leave"

export interface DayBreakdown {
  date: string
  dayType: DayType
  scheduled: boolean
  amIn: string | null
  amOut: string | null
  pmIn: string | null
  pmOut: string | null
  otIn: string | null
  otOut: string | null
  workedHours: number
  otHours: number
  nightDiffHours: number
  lateMinutes: number
  status: DayStatus
}

const DOW_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function overlapHours(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const s = Math.max(aStart.getTime(), bStart.getTime())
  const e = Math.min(aEnd.getTime(), bEnd.getTime())
  return e > s ? (e - s) / 3_600_000 : 0
}

// Hours of [start, end] that fall inside the recurring night window.
function nightDiffOverlap(
  start: Date,
  end: Date,
  nightStart: string,
  nightEnd: string,
): number {
  const ns = hhmmToMinutes(nightStart)
  const ne = hhmmToMinutes(nightEnd)
  let total = 0
  const day = new Date(start)
  day.setHours(0, 0, 0, 0)
  // The window can begin the day before the shift; step back one day to be safe.
  day.setDate(day.getDate() - 1)
  for (let i = 0; i < 3 && day <= end; i++) {
    const winStart = new Date(day)
    winStart.setHours(Math.floor(ns / 60), ns % 60, 0, 0)
    const winEnd = new Date(day)
    if (ne > ns) {
      winEnd.setHours(Math.floor(ne / 60), ne % 60, 0, 0)
    } else {
      winEnd.setDate(winEnd.getDate() + 1)
      winEnd.setHours(Math.floor(ne / 60), ne % 60, 0, 0)
    }
    total += overlapHours(start, end, winStart, winEnd)
    day.setDate(day.getDate() + 1)
  }
  return total
}

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

function fmtTime(d: Date | null): string | null {
  if (!d) return null
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`
}

// Duration of a single punch pair in hours (0 if either side is missing).
function segHours(a: Date | null, b: Date | null): number {
  if (!a || !b) return 0
  return Math.max(0, (b.getTime() - a.getTime()) / 3_600_000)
}

// Night-diff overlap for a punch pair, tolerant of missing punches.
function ndSeg(a: Date | null, b: Date | null, ns: string, ne: string): number {
  if (!a || !b) return 0
  return nightDiffOverlap(a, b, ns, ne)
}

// Leave types that are paid (count toward basic pay) vs. unpaid leave, which
// excuses the absence without paying for the day.
export const PAID_LEAVE_TYPES = new Set(["vacation", "sick", "emergency"])

export function isLeavePaid(type: string): boolean {
  return PAID_LEAVE_TYPES.has(type)
}

export interface AggregateAttendanceParams {
  dateFrom: string
  dateTo: string
  schedule: ScheduleInput | null
  holidays: { date: string; type: "regular" | "special_non_working" }[]
  logs: {
    logDate: string
    amIn: Date | null
    amOut: Date | null
    pmIn: Date | null
    pmOut: Date | null
    otIn: Date | null
    otOut: Date | null
  }[]
  settings: PayrollSettingsInput
  // Approved leave dates within the period, each flagged paid/unpaid.
  leaves?: { date: string; paid: boolean }[]
}

// Turns raw time logs + schedule + holiday calendar into hour buckets and a
// per-day breakdown used both by the payroll engine and the time-card view.
export function aggregateAttendance(
  params: AggregateAttendanceParams,
): { aggregate: AttendanceAggregate; days: DayBreakdown[] } {
  const { dateFrom, dateTo, settings } = params
  const schedule = params.schedule ?? DEFAULT_SCHEDULE
  const breakHours = schedule.breakMinutes / 60

  const holidayByDate = new Map(params.holidays.map((h) => [h.date, h.type]))
  const logByDate = new Map(params.logs.map((l) => [l.logDate, l]))
  const leaveByDate = new Map((params.leaves ?? []).map((l) => [l.date, l.paid]))

  const agg: AttendanceAggregate = {
    regularDaysWorked: 0,
    otHours: 0,
    nightDiffHours: 0,
    restDayHours: 0,
    regularHolidayHours: 0,
    specialHolidayHours: 0,
    lateMinutes: 0,
    daysAbsent: 0,
    paidLeaveDays: 0,
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
    const scheduled = schedule.workDays.includes(dow)
    const holidayType = holidayByDate.get(key)
    const log = logByDate.get(key)
    const firstIn = log?.amIn ?? log?.pmIn ?? null
    const lastOut = log?.pmOut ?? log?.amOut ?? null
    const present = !!(log && firstIn && lastOut)

    const dayType: DayType = holidayType
      ? holidayType === "regular"
        ? "regular_holiday"
        : "special_holiday"
      : scheduled
        ? "regular"
        : "rest_day"

    let workedHours = 0
    let otHours = 0
    let ndHours = 0
    let lateMinutes = 0

    if (log) {
      // Regular hours come from the morning + afternoon segments. If only a
      // single span was punched, fall back to first-in/last-out minus break.
      const amHrs = segHours(log.amIn, log.amOut)
      const pmHrs = segHours(log.pmIn, log.pmOut)
      if (amHrs + pmHrs > 0) {
        workedHours = amHrs + pmHrs
      } else if (firstIn && lastOut) {
        workedHours = Math.max(0, segHours(firstIn, lastOut) - breakHours)
      }
      // Overtime is explicit — driven by the OT punch pair, not by hours
      // worked beyond the standard day.
      otHours = segHours(log.otIn, log.otOut)
      // Night differential across worked time (per-segment, or the single span
      // fallback used by overnight shifts) plus any overtime.
      const ns = settings.nightDiffStart
      const ne = settings.nightDiffEnd
      ndHours = ndSeg(log.otIn, log.otOut, ns, ne)
      if (amHrs + pmHrs > 0) {
        ndHours +=
          ndSeg(log.amIn, log.amOut, ns, ne) + ndSeg(log.pmIn, log.pmOut, ns, ne)
      } else if (firstIn && lastOut) {
        ndHours += ndSeg(firstIn, lastOut, ns, ne)
      }
      // Lateness only matters on scheduled days, measured from the first punch.
      if (scheduled && firstIn) {
        const schedStart = new Date(cursor)
        const sm = hhmmToMinutes(schedule.timeIn)
        schedStart.setHours(Math.floor(sm / 60), sm % 60, 0, 0)
        const rawLate = Math.max(0, (firstIn.getTime() - schedStart.getTime()) / 60_000)
        lateMinutes = Math.max(0, rawLate - settings.lateGracePeriodMinutes)
      }
    }

    let status: DayStatus = "rest"

    if (dayType === "regular_holiday") {
      if (present) {
        agg.regularHolidayHours += workedHours
        agg.otHours += otHours
        agg.nightDiffHours += ndHours
        status = "present"
      } else {
        // Regular holidays are paid even when unworked.
        agg.regularDaysWorked += 1
        status = "holiday"
      }
    } else if (dayType === "special_holiday") {
      if (present) {
        agg.specialHolidayHours += workedHours
        agg.otHours += otHours
        agg.nightDiffHours += ndHours
        status = "present"
      } else {
        // "No work, no pay" for special non-working days.
        status = "holiday"
      }
    } else if (dayType === "rest_day") {
      if (present) {
        agg.restDayHours += workedHours
        agg.otHours += otHours
        agg.nightDiffHours += ndHours
        status = "present"
      } else if (settings.sundayHolidayPaid && cursor.getDay() === 0) {
        // Optional: pay employees for unworked Sundays.
        agg.regularDaysWorked += 1
        status = "holiday"
      } else {
        status = "rest"
      }
    } else {
      // Regular scheduled workday. A present day earns a full day's basic pay;
      // lateness is captured solely by the late deduction (no double penalty).
      // Overtime is taken from the explicit OT punch pair.
      if (present) {
        agg.regularDaysWorked += 1
        agg.otHours += otHours
        agg.nightDiffHours += ndHours
        agg.lateMinutes += lateMinutes
        status = "present"
      } else if (scheduled && leaveByDate.has(key)) {
        // Approved leave excuses the absence; paid leave also earns a day's pay.
        if (leaveByDate.get(key)) agg.paidLeaveDays += 1
        status = "leave"
      } else {
        agg.daysAbsent += 1
        status = "absent"
      }
    }

    days.push({
      date: key,
      dayType,
      scheduled,
      amIn: fmtTime(log?.amIn ?? null),
      amOut: fmtTime(log?.amOut ?? null),
      pmIn: fmtTime(log?.pmIn ?? null),
      pmOut: fmtTime(log?.pmOut ?? null),
      otIn: fmtTime(log?.otIn ?? null),
      otOut: fmtTime(log?.otOut ?? null),
      workedHours: round2(workedHours),
      otHours: round2(otHours),
      nightDiffHours: round2(ndHours),
      lateMinutes: Math.round(lateMinutes),
      status,
    })
  }

  agg.regularDaysWorked = round2(agg.regularDaysWorked)
  agg.otHours = round2(agg.otHours)
  agg.nightDiffHours = round2(agg.nightDiffHours)
  agg.restDayHours = round2(agg.restDayHours)
  agg.regularHolidayHours = round2(agg.regularHolidayHours)
  agg.specialHolidayHours = round2(agg.specialHolidayHours)
  agg.lateMinutes = Math.round(agg.lateMinutes)
  agg.paidLeaveDays = round2(agg.paidLeaveDays)

  return { aggregate: agg, days }
}

export interface AttendancePayrollInput {
  basicSalary: number
  allowance?: number
  settings: PayrollSettingsInput
  attendance: AttendanceAggregate
  deductToggles?: {
    sss?: boolean
    philhealth?: boolean
    pagibig?: boolean
    tax?: boolean
  }
  latePerMinuteOverride?: number | null
  loanDeduction?: number
}

export interface AttendancePayrollOutput {
  basicPay: number
  allowances: number
  otPay: number
  nightDiffPay: number
  restDayPay: number
  holidayPay: number
  grossPay: number
  lateDeduction: number
  sss: number
  philhealth: number
  pagibig: number
  withholdingTax: number
  loanDeduction: number
  thirteenthMonthPay: number
  netPay: number
  daysWorked: number
  lateMinutes: number
  otHours: number
}

export function calculatePayrollFromAttendance(
  input: AttendancePayrollInput,
): AttendancePayrollOutput {
  const {
    basicSalary,
    allowance = 0,
    settings,
    attendance: a,
    deductToggles = {},
    latePerMinuteOverride = null,
    loanDeduction = 0,
  } = input

  const dailyRate = basicSalary / settings.workingDaysPerMonth
  const hourlyRate = dailyRate / settings.workHoursPerDay

  // Paid leave is valued at the daily rate (actual) or a flat per-day amount.
  const leavePerDay = settings.leaveActualRate ? dailyRate : settings.leaveAmount
  const basicPay = round2(
    dailyRate * a.regularDaysWorked + leavePerDay * a.paidLeaveDays,
  )
  const otPay = settings.overtimeActualRate
    ? round2(a.otHours * hourlyRate * settings.otRate)
    : round2(a.otHours * settings.overtimeAmount)
  const nightDiffPay = settings.nightDiffActualRate
    ? round2(a.nightDiffHours * hourlyRate * settings.nightDiffRate)
    : round2(a.nightDiffHours * settings.nightDiffAmount)
  const restDayPay = round2(a.restDayHours * hourlyRate * settings.restDayRate)
  const holidayHours = a.regularHolidayHours + a.specialHolidayHours
  const holidayPay = settings.holidayActualRate
    ? round2(
        a.regularHolidayHours * hourlyRate * settings.regularHolidayRate +
          a.specialHolidayHours * hourlyRate * settings.specialHolidayRate,
      )
    : round2(holidayHours * settings.holidayAmount)

  const perMinuteLate =
    latePerMinuteOverride ??
    (settings.lateAmountPerMinute > 0 ? settings.lateAmountPerMinute : hourlyRate / 60)
  const lateDeduction = round2(a.lateMinutes * perMinuteLate)

  const grossPay = round2(
    basicPay + allowance + otPay + nightDiffPay + restDayPay + holidayPay - lateDeduction,
  )

  // Statutory contributions are based on monthly basic salary (PH practice),
  // gated by both the per-employee toggle and the system-wide setting.
  const sss =
    settings.sssEnabled && deductToggles.sss !== false ? calculateSSS(basicSalary) : 0
  const philhealth =
    settings.philhealthEnabled && deductToggles.philhealth !== false
      ? calculatePhilHealth(basicSalary, settings.philhealthRate)
      : 0
  const pagibig =
    settings.pagibigEnabled && deductToggles.pagibig !== false
      ? calculatePagIbig(basicSalary)
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
      (sss + philhealth + pagibig + withholdingTax + loanDeduction) +
      thirteenthMonthPay,
  )

  return {
    basicPay,
    allowances: round2(allowance),
    otPay,
    nightDiffPay,
    restDayPay,
    holidayPay,
    grossPay,
    lateDeduction,
    sss,
    philhealth,
    pagibig,
    withholdingTax,
    loanDeduction: round2(loanDeduction),
    thirteenthMonthPay,
    netPay,
    daysWorked: round2(a.regularDaysWorked + a.paidLeaveDays),
    lateMinutes: a.lateMinutes,
    otHours: a.otHours,
  }
}
