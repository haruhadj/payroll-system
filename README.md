# Payroll System

A web-based payroll management system for a Philippine company. It records employee
attendance, automatically computes each employee's pay per cutoff period — including
overtime, night differential, holiday pay, and late deductions — then applies the
mandatory government contributions (SSS, PhilHealth, Pag-IBIG) and BIR withholding tax to
produce a payslip. Access is role-based for Admin, HR, and Employee.

> **New here?** Read [`docs/plain-english-guide.md`](docs/plain-english-guide.md) for a
> jargon-free overview, or [`docs/index.md`](docs/index.md) for the full documentation.

📖 **Documentation website:** <https://haruhadj.github.io/payroll-system/> (built with
VitePress; auto-deploys from `docs/` on every push to `main`).

## Features

- **Authentication & roles** — email/password login with three roles (`admin`, `hr`,
  `employee`); access is enforced on every request.
- **Employee management** — records, per-employee salary/allowance, schedule assignment,
  and CSV import/export.
- **Attendance** — six-punch daily time logs (AM/PM/OT) and a per-employee time card.
- **Schedules & holidays** — work schedules (incl. night shift) and a holiday calendar
  (regular / special non-working).
- **Leaves & loans** — leave credits and approval workflow; loans with per-cutoff
  amortization and balance tracking.
- **Overtime** — overtime requests with approval.
- **Payroll processing** — period lifecycle (`draft → processed → released`) with an
  attendance-driven computation engine that bulk-generates payslips.
- **Payslips** — full earnings/deductions breakdown with an `approve → paid` workflow;
  employees view only their own.
- **Dashboard & reports** — key metrics and a per-period payroll summary.
- **Feedback** — employees rate (1–5) and comment per period; admins see all feedback.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (React), Tailwind CSS, TanStack Query |
| API | Hono, Zod validation |
| Auth | Better Auth |
| Database | PostgreSQL, Drizzle ORM |
| Runtime / tooling | Bun, TypeScript |

## Quick start

Requires [Bun](https://bun.sh) and a PostgreSQL database.

```bash
# 1. Configure environment
cp .env.example .env        # then fill in DATABASE_URL

# 2. Install, set up the database with sample data, and run
bun install
bun run db:reset-seed       # reset + migrate + seed
bun run dev                 # → http://localhost:3000
```

Then open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app (e.g. `http://localhost:3000`) |
| `RESEND_API_KEY` | Email (password reset) — optional for local testing |

### Seeded accounts

After `bun run db:seed`, these accounts exist:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@payroll.com` | `Admin@123456` |
| HR | `hr@payroll.com` | `Hr@123456` |
| Employee | `juan.delacruz@payroll.com` | `Employee@123` |
| Employee | `maria.santos@payroll.com` | `Employee@123` |

## Useful scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the development server |
| `bun run build` | Production build |
| `bun run db:migrate` | Apply database migrations |
| `bun run db:seed` | Seed sample data |
| `bun run db:reset-seed` | Reset, migrate, and seed in one step |
| `bun run tsx --env-file=.env scripts/verify-payroll.ts` | Verify payroll math against seeded data |

## Documentation

Full documentation lives in [`docs/`](docs/index.md):

- **[The System in Plain English](docs/plain-english-guide.md)** — jargon-free overview.
- **[Testing Guide](docs/testing-guide.md)** — setup, seeding, and the demo/test script.
- **[Tester Handout](docs/tester-handout.md)** · **[Plain-English Handout](docs/tester-handout-plain.md)** — sheets to give testers.
- **[Final Defense Guide](docs/defense-guide.md)** · **[Cheat Sheet](docs/defense-cheatsheet.md)** — defense preparation.
- **[Project Summary](PROJECT_SUMMARY.md)** — current feature status and future work.

## Project structure

```
app/          Next.js pages (auth + dashboard sections)
server/       Hono API routes, auth & role middleware
lib/          Payroll engine, database schema, auth, hooks
drizzle/      Database migrations
scripts/      migrate / seed / reset / verify-payroll
docs/         Documentation wiki
```

## Status & limitations

The core payroll cycle is complete. Known items reserved for future work include payslip
PDF export, automated payslip email on release, an audit trail, BIR year-end forms, and
multi-company support. See [`PROJECT_SUMMARY.md`](PROJECT_SUMMARY.md) for the full list.
