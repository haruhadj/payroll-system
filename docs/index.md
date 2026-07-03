# Payroll System — Docs Wiki

Documentation for setting up, testing, and demoing the payroll system.

## Contents

- **[Testing Guide](./testing-guide.md)** — Full step-by-step: environment setup, database seed, verifying payroll math, the demo/test script, and Q&A / defense prep.
- **[Tester Handout](./tester-handout.md)** — One-page sheet to give each tester: accounts, the flow to follow, and where to leave feedback.
- **[The System in Plain English](./plain-english-guide.md)** — A jargon-free explanation of what the system is and how it works, for anyone with no technical background (non-technical panelists, stakeholders, testers).
- **[Final Defense Guide](./defense-guide.md)** — Understand the system deeply and prepare for the panel: architecture in plain language, how the computation engine works, a worked payslip example, a panelist question bank with model answers, and how to defend the system's limitations.
- **[Defense-Day Cheat Sheet](./defense-cheatsheet.md)** — One printable page to hold during the defense: the pitch, the stack, the worked numbers, key formulas, and rapid answers.

See also **[../PROJECT_SUMMARY.md](../PROJECT_SUMMARY.md)** for the current feature status and future-work list.

## Quick start (TL;DR)

```bash
# 1. Create .env from the template and fill in DATABASE_URL
cp .env.example .env

# 2. Install, reset+seed the database, run
bun install
bun run db:reset-seed
bun run dev            # → http://localhost:3000

# 3. Verify payroll numbers before anyone tests
bun run tsx --env-file=.env scripts/verify-payroll.ts
```

Seeded login accounts are listed in the [Testing Guide](./testing-guide.md#test-accounts).
