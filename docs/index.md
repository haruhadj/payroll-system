---
layout: home

hero:
  name: Payroll System
  text: Documentation
  tagline: A web-based Philippine payroll management system — setup, testing, and thesis-defense preparation, all in one place.
  actions:
    - theme: brand
      text: Plain-English Overview
      link: /plain-english-guide
    - theme: alt
      text: Testing Guide
      link: /testing-guide
    - theme: alt
      text: Defense Guide
      link: /defense-guide

features:
  - title: The System in Plain English
    details: A jargon-free explanation of what the system is and how it works — for non-technical panelists, stakeholders, and testers.
    link: /plain-english-guide
  - title: Testing Guide
    details: Step-by-step setup, database seeding, verifying payroll math, and the demo/test script to run before testers arrive.
    link: /testing-guide
  - title: Tester Handouts
    details: One-page sheets to give each tester — technical and plain-English versions — with accounts, the flow to follow, and where to leave feedback.
    link: /tester-handout
  - title: Final Defense Guide
    details: Architecture in plain language, the computation engine explained, a worked payslip, a panelist question bank with model answers, and how to defend limitations.
    link: /defense-guide
  - title: Defense-Day Cheat Sheet
    details: One printable page to hold during the defense — the pitch, the stack, the worked numbers, key formulas, and rapid answers.
    link: /defense-cheatsheet
  - title: Project Summary
    details: The current feature status and future-work list for the system.
    link: https://github.com/haruhadj/payroll-system/blob/main/PROJECT_SUMMARY.md
---

## Documentation index

- **[The System in Plain English](./plain-english-guide.md)** — jargon-free overview for anyone.
- **[Testing Guide](./testing-guide.md)** — setup, seeding, verifying payroll math, and the demo/test script.
- **[Tester Handout](./tester-handout.md)** · **[Plain-English Handout](./tester-handout-plain.md)** — sheets to give testers.
- **[Final Defense Guide](./defense-guide.md)** — deep defense preparation with a panelist Q&A bank.
- **[Defense-Day Cheat Sheet](./defense-cheatsheet.md)** — printable one-pager.
- **[Project Summary](https://github.com/haruhadj/payroll-system/blob/main/PROJECT_SUMMARY.md)** — current feature status and future work.

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
