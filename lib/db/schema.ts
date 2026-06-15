import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  numeric,
  integer,
  date,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { createSelectSchema, createInsertSchema } from "drizzle-zod"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["admin", "hr", "employee"])
export const employmentTypeEnum = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contractual",
])
export const payrollStatusEnum = pgEnum("payroll_status", [
  "draft",
  "processed",
  "released",
])
export const payslipStatusEnum = pgEnum("payslip_status", [
  "pending",
  "approved",
  "paid",
])
export const timeLogSourceEnum = pgEnum("time_log_source", [
  "manual",
  "biometric",
])
export const holidayTypeEnum = pgEnum("holiday_type", [
  "regular",
  "special_non_working",
])
export const leaveTypeEnum = pgEnum("leave_type", [
  "vacation",
  "sick",
  "emergency",
  "unpaid",
])
export const leaveStatusEnum = pgEnum("leave_status", [
  "pending",
  "approved",
  "rejected",
])
export const loanTypeEnum = pgEnum("loan_type", [
  "sss",
  "pagibig",
  "company",
  "other",
])
export const loanStatusEnum = pgEnum("loan_status", [
  "active",
  "paid",
  "cancelled",
])
export const taxFrequencyEnum = pgEnum("tax_frequency", [
  "daily",
  "weekly",
  "semi_monthly",
  "monthly",
])

// ---------------------------------------------------------------------------
// Better Auth tables
// ---------------------------------------------------------------------------

export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("employee"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_user_email").on(t.email)],
)

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_account_unique").on(t.accountId, t.providerId),
    index("idx_account_user_id").on(t.userId),
  ],
)

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_session_user_id").on(t.userId)],
)

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// Payroll domain tables
// ---------------------------------------------------------------------------

export const employees = pgTable(
  "employee",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    employeeNo: text("employee_no").notNull().unique(),
    department: text("department").notNull(),
    position: text("position").notNull(),
    employmentType: employmentTypeEnum("employment_type")
      .notNull()
      .default("full_time"),
    // Organizational classification (managed via Manage Options).
    groupName: text("group_name"),
    basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull(),
    allowance: numeric("allowance", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    hiredAt: date("hired_at").notNull(),
    scheduleId: uuid("schedule_id").references(() => schedules.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").notNull().default(true),
    deductSss: boolean("deduct_sss").notNull().default(true),
    deductPhilhealth: boolean("deduct_philhealth").notNull().default(true),
    deductPagibig: boolean("deduct_pagibig").notNull().default(true),
    deductTax: boolean("deduct_tax").notNull().default(true),
    latePerMinuteOverride: numeric("late_per_minute_override", {
      precision: 10,
      scale: 4,
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_employee_user_id").on(t.userId),
    index("idx_employee_no").on(t.employeeNo),
    index("idx_employee_schedule_id").on(t.scheduleId),
    index("idx_employee_active").on(t.isActive),
  ],
)

export const payrollPeriods = pgTable(
  "payroll_period",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    dateFrom: date("date_from").notNull(),
    dateTo: date("date_to").notNull(),
    status: payrollStatusEnum("status").notNull().default("draft"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_payroll_period_status").on(t.status),
    index("idx_payroll_period_dates").on(t.dateFrom, t.dateTo),
  ],
)

export const payslips = pgTable(
  "payslip",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    periodId: uuid("period_id")
      .notNull()
      .references(() => payrollPeriods.id, { onDelete: "cascade" }),
    basicPay: numeric("basic_pay", { precision: 12, scale: 2 }).notNull(),
    allowances: numeric("allowances", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    otPay: numeric("ot_pay", { precision: 12, scale: 2 }).notNull().default("0"),
    nightDiffPay: numeric("night_diff_pay", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    restDayPay: numeric("rest_day_pay", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    holidayPay: numeric("holiday_pay", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    grossPay: numeric("gross_pay", { precision: 12, scale: 2 }).notNull(),
    lateDeduction: numeric("late_deduction", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    sss: numeric("sss", { precision: 10, scale: 2 }).notNull(),
    philhealth: numeric("philhealth", { precision: 10, scale: 2 }).notNull(),
    pagibig: numeric("pagibig", { precision: 10, scale: 2 }).notNull(),
    withholdingTax: numeric("withholding_tax", {
      precision: 10,
      scale: 2,
    }).notNull(),
    loanDeduction: numeric("loan_deduction", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    thirteenthMonthPay: numeric("thirteenth_month_pay", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    daysWorked: numeric("days_worked", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    lateMinutes: integer("late_minutes").notNull().default(0),
    otHours: numeric("ot_hours", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    netPay: numeric("net_pay", { precision: 12, scale: 2 }).notNull(),
    status: payslipStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_payslip_unique").on(t.employeeId, t.periodId),
    index("idx_payslip_employee_id").on(t.employeeId),
    index("idx_payslip_period_id").on(t.periodId),
    index("idx_payslip_status").on(t.status),
  ],
)

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    periodId: uuid("period_id")
      .notNull()
      .references(() => payrollPeriods.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_feedback_unique").on(t.employeeId, t.periodId),
    index("idx_feedback_employee_id").on(t.employeeId),
    index("idx_feedback_period_id").on(t.periodId),
  ],
)

// ---------------------------------------------------------------------------
// Attendance domain tables
// ---------------------------------------------------------------------------

export const schedules = pgTable("schedule", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  timeIn: text("time_in").notNull(), // "HH:MM"
  timeOut: text("time_out").notNull(), // "HH:MM"
  breakMinutes: integer("break_minutes").notNull().default(60),
  workDays: text("work_days")
    .array()
    .notNull()
    .default(["mon", "tue", "wed", "thu", "fri"]),
  isNightShift: boolean("is_night_shift").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const timeLogs = pgTable(
  "time_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    // Six-punch model: morning, afternoon, and overtime segments.
    amIn: timestamp("am_in"),
    amOut: timestamp("am_out"),
    pmIn: timestamp("pm_in"),
    pmOut: timestamp("pm_out"),
    otIn: timestamp("ot_in"),
    otOut: timestamp("ot_out"),
    source: timeLogSourceEnum("source").notNull().default("manual"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_time_log_unique").on(t.employeeId, t.logDate),
    index("idx_time_log_employee_id").on(t.employeeId),
    index("idx_time_log_date").on(t.logDate),
  ],
)

export const holidays = pgTable(
  "holiday",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    date: date("date").notNull().unique(),
    type: holidayTypeEnum("type").notNull().default("regular"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_holiday_date").on(t.date)],
)

// Singleton configuration row (id is always "default").
export const payrollSettings = pgTable("payroll_settings", {
  id: text("id").primaryKey().default("default"),
  otRate: numeric("ot_rate", { precision: 5, scale: 2 }).notNull().default("1.25"),
  restDayRate: numeric("rest_day_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("1.30"),
  restDayOtRate: numeric("rest_day_ot_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("1.69"),
  nightDiffRate: numeric("night_diff_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("0.10"),
  regularHolidayRate: numeric("regular_holiday_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("2.00"),
  specialHolidayRate: numeric("special_holiday_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("1.30"),
  workingDaysPerMonth: integer("working_days_per_month").notNull().default(22),
  workHoursPerDay: numeric("work_hours_per_day", { precision: 4, scale: 2 })
    .notNull()
    .default("8"),
  lateGracePeriodMinutes: integer("late_grace_period_minutes")
    .notNull()
    .default(0),
  nightDiffStart: text("night_diff_start").notNull().default("22:00"),
  nightDiffEnd: text("night_diff_end").notNull().default("06:00"),
  thirteenthMonthEveryCutoff: boolean("thirteenth_month_every_cutoff")
    .notNull()
    .default(false),
  sssEnabled: boolean("sss_enabled").notNull().default(true),
  philhealthEnabled: boolean("philhealth_enabled").notNull().default(true),
  pagibigEnabled: boolean("pagibig_enabled").notNull().default(true),
  taxEnabled: boolean("tax_enabled").notNull().default(true),
  philhealthRate: numeric("philhealth_rate", { precision: 6, scale: 4 })
    .notNull()
    .default("0.0275"),
  // Notification contacts.
  adminEmail: text("admin_email"),
  hrEmail: text("hr_email"),
  // Withholding-tax deduction frequency.
  withholdingTaxFrequency: taxFrequencyEnum("withholding_tax_frequency")
    .notNull()
    .default("semi_monthly"),
  // Flat amounts (used when the matching "actual rate" toggle is OFF). When a
  // toggle is ON, the corresponding multiplier above is used instead.
  overtimeAmount: numeric("overtime_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  overtimeActualRate: boolean("overtime_actual_rate").notNull().default(true),
  holidayAmount: numeric("holiday_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  holidayActualRate: boolean("holiday_actual_rate").notNull().default(true),
  nightDiffAmount: numeric("night_diff_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  nightDiffActualRate: boolean("night_diff_actual_rate").notNull().default(true),
  leaveAmount: numeric("leave_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  leaveActualRate: boolean("leave_actual_rate").notNull().default(true),
  // Lateness penalty per minute (0 = derive from hourly rate ÷ 60).
  lateAmountPerMinute: numeric("late_amount_per_minute", { precision: 10, scale: 4 })
    .notNull()
    .default("0"),
  // Pay employees for unworked Sundays (regular holiday, no work with pay).
  sundayHolidayPaid: boolean("sunday_holiday_paid").notNull().default(false),
  // Toggles employee self-service clock in/out.
  enableClockInOut: boolean("enable_clock_in_out").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Singleton company profile row (id is always "default").
export const companyProfile = pgTable("company_profile", {
  id: text("id").primaryKey().default("default"),
  name: text("name").notNull().default(""),
  address: text("address"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// Leaves & loans domain tables
// ---------------------------------------------------------------------------

// Running balance of leave days per employee and leave type.
export const leaveCredits = pgTable(
  "leave_credit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    type: leaveTypeEnum("type").notNull(),
    balance: numeric("balance", { precision: 6, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_leave_credit_unique").on(t.employeeId, t.type),
    index("idx_leave_credit_employee_id").on(t.employeeId),
  ],
)

export const leaveRequests = pgTable(
  "leave_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    type: leaveTypeEnum("type").notNull(),
    dateFrom: date("date_from").notNull(),
    dateTo: date("date_to").notNull(),
    days: numeric("days", { precision: 5, scale: 2 }).notNull(),
    status: leaveStatusEnum("status").notNull().default("pending"),
    reason: text("reason"),
    approvedBy: text("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_leave_request_employee_id").on(t.employeeId),
    index("idx_leave_request_status").on(t.status),
    index("idx_leave_request_dates").on(t.dateFrom, t.dateTo),
  ],
)

export const loans = pgTable(
  "loan",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    type: loanTypeEnum("type").notNull().default("company"),
    principal: numeric("principal", { precision: 12, scale: 2 }).notNull(),
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
    amortization: numeric("amortization", { precision: 12, scale: 2 }).notNull(),
    status: loanStatusEnum("status").notNull().default("active"),
    startDate: date("start_date").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_loan_employee_id").on(t.employeeId),
    index("idx_loan_status").on(t.status),
  ],
)

// Overtime requests: filed by employees, approved by admin/HR. Reuses the
// leave status workflow (pending → approved/rejected).
export const overtimeRequests = pgTable(
  "overtime_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    timeFrom: text("time_from").notNull(), // "HH:MM"
    timeTo: text("time_to").notNull(), // "HH:MM"
    hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),
    status: leaveStatusEnum("status").notNull().default("pending"),
    note: text("note"),
    approvedBy: text("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_overtime_request_employee_id").on(t.employeeId),
    index("idx_overtime_request_status").on(t.status),
    index("idx_overtime_request_date").on(t.date),
  ],
)

// ---------------------------------------------------------------------------
// Organizational options (Manage Options): designations, groups, teams
// ---------------------------------------------------------------------------

// Job roles / hierarchy (e.g. Dept. Head, Supervisor, Rider).
export const designations = pgTable("designation", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Employment statuses (e.g. Regular, Probationary, Trainee).
export const groups = pgTable("group", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Departments / functional units (e.g. Field, Administrative, Accounting).
export const teams = pgTable("team", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// User profile (About, Emergency Contact, Files)
// ---------------------------------------------------------------------------

// One-to-one extended profile for every user (admin, hr, employee).
export const userProfiles = pgTable("user_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  username: text("username"),
  contactNo1: text("contact_no1"),
  contactNo2: text("contact_no2"),
  address: text("address"),
  biometricId: text("biometric_id"),
  // In Case of Emergency (ICE).
  iceName: text("ice_name"),
  iceContact: text("ice_contact"),
  iceEmail: text("ice_email"),
  iceAddress: text("ice_address"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Files tab: external document links (no in-app storage).
export const userDocuments = pgTable(
  "user_document",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    type: text("type"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_user_document_user_id").on(t.userId)],
)

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  employee: one(employees, {
    fields: [users.id],
    references: [employees.userId],
  }),
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  documents: many(userDocuments),
  accounts: many(accounts),
  sessions: many(sessions),
}))

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
}))

export const userDocumentsRelations = relations(userDocuments, ({ one }) => ({
  user: one(users, { fields: [userDocuments.userId], references: [users.id] }),
}))

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  schedule: one(schedules, {
    fields: [employees.scheduleId],
    references: [schedules.id],
  }),
  payslips: many(payslips),
  feedback: many(feedback),
  timeLogs: many(timeLogs),
  leaveCredits: many(leaveCredits),
  leaveRequests: many(leaveRequests),
  loans: many(loans),
  overtimeRequests: many(overtimeRequests),
}))

export const schedulesRelations = relations(schedules, ({ many }) => ({
  employees: many(employees),
}))

export const leaveCreditsRelations = relations(leaveCredits, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveCredits.employeeId],
    references: [employees.id],
  }),
}))

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveRequests.employeeId],
    references: [employees.id],
  }),
  approver: one(users, {
    fields: [leaveRequests.approvedBy],
    references: [users.id],
  }),
}))

export const overtimeRequestsRelations = relations(overtimeRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [overtimeRequests.employeeId],
    references: [employees.id],
  }),
  approver: one(users, {
    fields: [overtimeRequests.approvedBy],
    references: [users.id],
  }),
}))

export const loansRelations = relations(loans, ({ one }) => ({
  employee: one(employees, {
    fields: [loans.employeeId],
    references: [employees.id],
  }),
}))

export const timeLogsRelations = relations(timeLogs, ({ one }) => ({
  employee: one(employees, {
    fields: [timeLogs.employeeId],
    references: [employees.id],
  }),
}))

export const payrollPeriodsRelations = relations(
  payrollPeriods,
  ({ many }) => ({
    payslips: many(payslips),
    feedback: many(feedback),
  }),
)

export const payslipsRelations = relations(payslips, ({ one }) => ({
  employee: one(employees, {
    fields: [payslips.employeeId],
    references: [employees.id],
  }),
  period: one(payrollPeriods, {
    fields: [payslips.periodId],
    references: [payrollPeriods.id],
  }),
}))

export const feedbackRelations = relations(feedback, ({ one }) => ({
  employee: one(employees, {
    fields: [feedback.employeeId],
    references: [employees.id],
  }),
  period: one(payrollPeriods, {
    fields: [feedback.periodId],
    references: [payrollPeriods.id],
  }),
}))

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const selectEmployeeSchema = createSelectSchema(employees)
export const insertEmployeeSchema = createInsertSchema(employees, {
  basicSalary: z.string().refine((v) => parseFloat(v) > 0, {
    message: "Salary must be positive",
  }),
  allowance: z
    .string()
    .refine((v) => parseFloat(v) >= 0, { message: "Allowance cannot be negative" })
    .optional(),
}).omit({ id: true, createdAt: true })
export const updateEmployeeSchema = insertEmployeeSchema.partial()

export const selectPayrollPeriodSchema = createSelectSchema(payrollPeriods)
export const insertPayrollPeriodSchema = createInsertSchema(payrollPeriods).omit(
  { id: true, createdAt: true, status: true },
)

export const selectPayslipSchema = createSelectSchema(payslips)

export const selectFeedbackSchema = createSelectSchema(feedback)
export const insertFeedbackSchema = createInsertSchema(feedback, {
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
}).omit({ id: true, createdAt: true })

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const selectScheduleSchema = createSelectSchema(schedules)
export const insertScheduleSchema = createInsertSchema(schedules, {
  name: z.string().min(1, "Name is required"),
  timeIn: z.string().regex(timeRegex, "Use HH:MM (24h) format"),
  timeOut: z.string().regex(timeRegex, "Use HH:MM (24h) format"),
  breakMinutes: z.number().int().min(0).max(480).optional(),
  workDays: z.array(z.string()).min(1, "Pick at least one work day"),
}).omit({ id: true, createdAt: true })
export const updateScheduleSchema = insertScheduleSchema.partial()

export const selectTimeLogSchema = createSelectSchema(timeLogs)
export const insertTimeLogSchema = createInsertSchema(timeLogs, {
  amIn: z.coerce.date().optional().nullable(),
  amOut: z.coerce.date().optional().nullable(),
  pmIn: z.coerce.date().optional().nullable(),
  pmOut: z.coerce.date().optional().nullable(),
  otIn: z.coerce.date().optional().nullable(),
  otOut: z.coerce.date().optional().nullable(),
}).omit({ id: true, createdAt: true, source: true })
export const updateTimeLogSchema = insertTimeLogSchema.partial()

export const selectHolidaySchema = createSelectSchema(holidays)
export const insertHolidaySchema = createInsertSchema(holidays, {
  name: z.string().min(1, "Name is required"),
}).omit({ id: true, createdAt: true })
export const updateHolidaySchema = insertHolidaySchema.partial()

export const selectPayrollSettingsSchema = createSelectSchema(payrollSettings)
export const updatePayrollSettingsSchema = createInsertSchema(payrollSettings, {
  adminEmail: z.string().email().or(z.literal("")).optional().nullable(),
  hrEmail: z.string().email().or(z.literal("")).optional().nullable(),
})
  .omit({ id: true, updatedAt: true })
  .partial()

export const selectCompanyProfileSchema = createSelectSchema(companyProfile)
export const updateCompanyProfileSchema = createInsertSchema(companyProfile, {
  email: z.string().email().or(z.literal("")).optional().nullable(),
  website: z.string().url().or(z.literal("")).optional().nullable(),
})
  .omit({ id: true, updatedAt: true })
  .partial()

export const selectLeaveCreditSchema = createSelectSchema(leaveCredits)
export const upsertLeaveCreditSchema = createInsertSchema(leaveCredits, {
  balance: z
    .string()
    .refine((v) => parseFloat(v) >= 0, { message: "Balance cannot be negative" }),
}).omit({ id: true, createdAt: true })

export const selectLeaveRequestSchema = createSelectSchema(leaveRequests)
export const insertLeaveRequestSchema = createInsertSchema(leaveRequests, {
  days: z
    .string()
    .refine((v) => parseFloat(v) > 0, { message: "Days must be positive" }),
  reason: z.string().max(1000).optional().nullable(),
})
  .omit({ id: true, createdAt: true, status: true, approvedBy: true })
// employeeId is filled from the session for self-service requests.
export const createLeaveRequestSchema = insertLeaveRequestSchema
  .omit({ employeeId: true })
  .extend({ employeeId: z.string().uuid().optional() })

export const selectLoanSchema = createSelectSchema(loans)
export const insertLoanSchema = createInsertSchema(loans, {
  principal: z
    .string()
    .refine((v) => parseFloat(v) > 0, { message: "Principal must be positive" }),
  amortization: z
    .string()
    .refine((v) => parseFloat(v) > 0, { message: "Amortization must be positive" }),
  balance: z.string().optional(),
}).omit({ id: true, createdAt: true })
export const updateLoanSchema = insertLoanSchema.partial()

export const selectOvertimeRequestSchema = createSelectSchema(overtimeRequests)
export const insertOvertimeRequestSchema = createInsertSchema(overtimeRequests, {
  hours: z
    .string()
    .refine((v) => parseFloat(v) > 0, { message: "Hours must be positive" }),
  note: z.string().max(1000).optional().nullable(),
}).omit({ id: true, createdAt: true, status: true, approvedBy: true })
// employeeId is filled from the session for self-service requests.
export const createOvertimeRequestSchema = insertOvertimeRequestSchema
  .omit({ employeeId: true })
  .extend({ employeeId: z.string().uuid().optional() })

// Manage Options: all three lists share the same { name } shape.
export const optionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
})

export const selectUserProfileSchema = createSelectSchema(userProfiles)
export const updateUserProfileSchema = createInsertSchema(userProfiles, {
  iceEmail: z.string().email().or(z.literal("")).optional().nullable(),
})
  .omit({ userId: true, updatedAt: true })
  .partial()

export const selectUserDocumentSchema = createSelectSchema(userDocuments)
export const insertUserDocumentSchema = createInsertSchema(userDocuments, {
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  type: z.string().optional().nullable(),
}).omit({ id: true, userId: true, createdAt: true })
