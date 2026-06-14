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
    basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull(),
    hiredAt: date("hired_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_employee_user_id").on(t.userId),
    index("idx_employee_no").on(t.employeeNo),
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
    grossPay: numeric("gross_pay", { precision: 12, scale: 2 }).notNull(),
    sss: numeric("sss", { precision: 10, scale: 2 }).notNull(),
    philhealth: numeric("philhealth", { precision: 10, scale: 2 }).notNull(),
    pagibig: numeric("pagibig", { precision: 10, scale: 2 }).notNull(),
    withholdingTax: numeric("withholding_tax", {
      precision: 10,
      scale: 2,
    }).notNull(),
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
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  employee: one(employees, {
    fields: [users.id],
    references: [employees.userId],
  }),
  accounts: many(accounts),
  sessions: many(sessions),
}))

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  payslips: many(payslips),
  feedback: many(feedback),
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
