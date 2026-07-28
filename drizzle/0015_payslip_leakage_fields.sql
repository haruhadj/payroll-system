ALTER TABLE "payslip" ADD COLUMN IF NOT EXISTS "actual_net_pay" numeric(12,2);
ALTER TABLE "payslip" ADD COLUMN IF NOT EXISTS "paid_at" timestamp;
