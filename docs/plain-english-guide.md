# The System in Plain English

A jargon-free explanation of what this system is and how it works — written for anyone,
no technical background needed. If you can read a payslip, you can understand this.

---

## What is it, in one sentence?

It's a website that a company uses to pay its employees correctly and automatically —
it keeps track of who worked, for how long, figures out how much each person should be
paid, subtracts the required government deductions, and produces each person's payslip.

Think of it as replacing a messy pile of spreadsheets and a calculator with one tidy,
automatic system that everyone logs into.

---

## What problem does it solve?

Paying employees by hand is slow and easy to get wrong. Someone has to:

- count how many days each person worked,
- add overtime, night-shift pay, and holiday pay,
- subtract the government contributions (SSS, PhilHealth, Pag-IBIG) and tax,
- and do this for every single employee, every payday.

One typo and someone gets paid the wrong amount. Our system does all of that math
automatically and the same way every time, so it's faster and far more accurate.

---

## Who uses it, and what can each person do?

There are three kinds of users. Think of them as three different keys that open
different doors:

- **Admin** — the owner of the system. Can do everything, including adding new users.
- **HR** — the payroll staff. Manages employees, attendance, and runs the payroll.
- **Employee** — a regular worker. Can only see *their own* payslips and leave feedback.
  They cannot see anyone else's salary or the admin areas — the system blocks that.

Everyone has their own private login (email and password), just like online banking.

---

## How it works, step by step

Here is the whole journey, from "someone came to work" to "here's your payslip":

1. **The company sets things up once.** It enters each employee's basic monthly salary,
   their allowance, and their work schedule (for example, 8 AM to 5 PM, Monday to
   Friday). It also enters the holidays for the year.

2. **Attendance gets recorded.** Each day, an employee's time in and time out are logged
   — morning in, morning out, afternoon in, afternoon out, and any overtime. This is the
   raw record of who actually worked and when.

3. **HR starts a payroll for a pay period.** For example, "June 1–15." At this point it's
   just a draft — nothing has been paid yet.

4. **The system does the math — automatically.** For every employee, it looks at the
   attendance records and works out:
   - how many days they actually worked (so someone who was absent isn't paid for that
     day),
   - extra pay for overtime, night shifts, and holidays,
   - a deduction if they came in late,
   - the government contributions and tax,
   - any loan payment due that period.

   Then it calculates the final take-home amount. It does this for everyone in seconds.

5. **Payslips are produced.** Each employee gets a payslip showing all the details:
   basic pay, extras, deductions, and the final amount they take home.

6. **The employee views their payslip.** They log in, see only their own payslip, and can
   leave a rating and comment as feedback.

---

## A real example (follow the money)

Let's follow one employee — Juan — for the June 1–15 pay period. His monthly salary is
₱30,000, and he gets a ₱2,000 allowance.

**First, the system figures out his "rates":**
- His pay for one day of work is his monthly salary divided across the working days:
  about **₱1,363 per day**.

**Then it adds up what he earned:**
- He worked 9 days → about **₱12,273** in basic pay.
- He did 2 hours of overtime → an extra **₱426**.
- He worked on a holiday → an extra **₱1,773**.
- Plus his ₱2,000 allowance.
- He came in late once → a small **₱128** deduction.
- **This gives a total ("gross pay") of about ₱16,344.**

**Then it subtracts what's required by law and his loan:**
- SSS: ₱519 · PhilHealth: ₱825 · Pag-IBIG: ₱200 · Tax: ₱0 for this period · Loan
  payment: ₱1,000.

**What's left is his take-home pay: about ₱13,800.**

The nice part: if HR later approves a day of paid leave Juan requested, the system
instantly recalculates and his pay goes up by one day's worth — no manual recomputing.

> Note for the defense: these are example figures. Before you present, the team should
> run the built-in check to confirm the exact centavo amounts and use those.

---

## Is people's private information safe?

Yes, and here's the simple version of why:

- Everyone needs their own login to get in.
- Passwords are stored scrambled, so even the people running the system can't read them.
- An employee can *only* ever see their own information. If they somehow tried to peek at
  a co-worker's salary, the system refuses — the block is on the system's side, not just
  hidden from view on the screen.
- The system checks "are you allowed to do this?" on every single action.

---

## Questions a non-technical person might ask (with simple answers)

- **"So it's basically an automatic payroll calculator?"**
  Yes — but a complete one. It also stores employee records, tracks attendance, handles
  leaves and loans, and gives each employee their own payslip.

- **"What if someone was absent or came in late?"**
  The system knows from the attendance records. An absent day isn't paid, and lateness is
  deducted automatically.

- **"Where do the deduction amounts come from — did you just make them up?"**
  No. They follow the official Philippine government rules for SSS, PhilHealth, Pag-IBIG,
  and the tax table. If the government changes the rates, they can be updated.

- **"How do you know the math is correct?"**
  There's a built-in checking tool that runs the same calculations on sample data so we
  can compare the results against a manual computation and confirm they match.

- **"Can an employee change their own salary or see others' pay?"**
  No. Employees can only view their own payslips and update their own profile. Everything
  else is locked to Admin and HR.

- **"What happens on holidays or night shifts?"**
  The system pays the correct extra amount automatically — more for holiday work, and a
  night-shift bonus for late-night hours — following the standard rules.

---

## What it doesn't do yet (and that's okay to say)

Every system has a boundary. Ours currently does **not**:

- produce a downloadable PDF of the payslip (it's shown on screen),
- automatically email payslips to employees,
- keep a detailed history log of who changed what,
- generate the year-end government tax forms,
- handle more than one company at a time.

These aren't mistakes — they're features planned for a future version. Being clear about
what's finished and what's next is a sign the project is well understood.

---

## The bottom line

The company sets up employees and records attendance. The system does all the payroll
math automatically and accurately, following Philippine rules. Employees securely view
their own payslips and give feedback. It's faster, more accurate, and safer than doing
payroll by hand.
