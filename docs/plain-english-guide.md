# The System in Plain English

A jargon-free explanation of what this system is and how it works — written for anyone,
no technical background needed. If you can read a payslip, you can understand this.

---

## What is it, in one sentence?

It's a website that a school uses to pay its staff correctly and automatically — it
assumes every teacher/staff member worked their scheduled days unless told otherwise,
figures out how much each person should be paid, subtracts the required government
deductions, and produces each person's payslip.

Think of it as replacing a messy pile of spreadsheets and a calculator with one tidy,
automatic system that everyone logs into.

---

## What problem does it solve?

Paying staff by hand is slow and easy to get wrong. Someone has to:

- track absences and approved leave for every staff member,
- subtract the government contributions (SSS, PhilHealth, Pag-IBIG) and tax,
- and do this for every single employee, every payday.

One typo and someone gets paid the wrong amount. Our system does all of that math
automatically and the same way every time, so it's faster and far more accurate.

---

## Who uses it, and what can each person do?

There are three kinds of users. Think of them as three different keys that open
different doors:

- **Admin** — the owner of the system. Can do everything, including adding new users.
- **HR** — the payroll staff. Manages employees, logs absences, and runs the payroll.
- **Employee** — a regular worker. Can only see *their own* payslips and leave feedback.
  They cannot see anyone else's salary or the admin areas — the system blocks that.

Everyone has their own private login (email and password), just like online banking.

---

## How it works, step by step

Here is the whole journey, from "someone came to work" to "here's your payslip":

1. **The school sets things up once.** It enters each staff member's basic monthly
   salary and allowance, and the school week (for example, Monday to Friday).

2. **Attendance is assumed, not punched in.** Staff are monthly-paid, so every
   scheduled school day is assumed worked by default. HR only creates a record when
   something is different — an absence, or an approved leave request. No time clock,
   no daily punching in and out.

3. **HR starts a payroll for a pay period.** For example, "June 1–15." At this point it's
   just a draft — nothing has been paid yet.

4. **The system does the math — automatically.** For every employee, it looks at logged
   absences and approved leave and works out:
   - how many scheduled days they were actually present for (so someone who was
     absent without leave isn't paid for that day),
   - paid-leave days (approved vacation/sick/emergency leave still earns a day's pay),
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

**First, the system figures out his "rate":**
- He's paid twice a month, so half his monthly salary — **₱15,000** — covers this half.
- The school week is Monday–Friday, so June 1–15 has **11 scheduled days**.
- Splitting ₱15,000 across those 11 days gives about **₱1,363 per day**. (A shorter
  half-month with only 7 school days would give a *higher* daily rate, because the same
  ₱15,000 is spread over fewer days.)

**Then it adds up what he earned:**
- He was present for 10 of the 11 days (he's out on Jun 15, pending a leave request) →
  about **₱13,636** in basic pay.
- Plus his ₱2,000 allowance.
- **This gives a total ("gross pay") of about ₱15,636.**

**Then it subtracts his contributions and his loan:**
- SSS: **₱350** — this is a 15th-payday deduction.
- PhilHealth and Pag-IBIG: **₱0 this time** — those two (₱250 and ₱200) come out of the
  30th payday instead, so each payday carries a smaller bite.
- Tax: ₱0 for this period · Loan payment: ₱1,000.

**What's left is his take-home pay: about ₱14,286.**

The nice part: if HR later approves Juan's paid leave for Jun 15, the system instantly
recalculates — that day flips from an unpaid absence to a paid leave day — and his pay
goes up by one day's worth (about ₱1,364) to roughly **₱15,650**. No manual
recomputing.

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
  Yes — but a complete one. It also stores employee records, logs absences, handles
  leaves and loans, and gives each employee their own payslip.

- **"What if someone was absent?"**
  HR logs the date as an absence, and that day isn't paid. If it's later covered by an
  approved leave request, the system automatically switches it to paid leave instead.

- **"Why isn't there a time clock / biometric log?"**
  Teachers and school staff are paid a fixed monthly salary and follow a class schedule,
  not a shift punch clock. The system assumes every scheduled day is worked and only
  needs HR to record the exceptions — which is both simpler and closer to how school
  payroll actually works.

- **"Where do the deduction amounts come from — did you just make them up?"**
  No. The tax follows the official Philippine tax table. The SSS, PhilHealth, and Pag-IBIG
  amounts are the fixed figures the school itself deducts (₱350, ₱250, ₱200), entered in
  the system's settings — so if the school changes them, nobody has to touch the code. The
  official government contribution tables are built in too and can be switched on instead.

- **"Why doesn't every payday deduct the same thing?"**
  On purpose. SSS comes out on the 15th; PhilHealth and Pag-IBIG come out on the 30th.
  Spreading them means neither payday takes the whole ₱800 at once.

- **"How do you know the math is correct?"**
  There's a built-in checking tool that runs the same calculations on sample data so we
  can compare the results against a manual computation and confirm they match.

- **"Can an employee change their own salary or see others' pay?"**
  No. Employees can only view their own payslips and update their own profile. Everything
  else is locked to Admin and HR.

- **"What about holidays or overtime?"**
  There's no separate holiday or overtime pay. Under Philippine labor rules, employees
  paid a fixed monthly salary are already considered paid for every day of the month,
  including holidays and rest days — so the system doesn't compute it a second time.

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

The school sets up its staff and logs absences and leave as they happen. The system does
all the payroll math automatically and accurately, following Philippine rules. Employees
securely view their own payslips and give feedback. It's faster, more accurate, and
safer than doing payroll by hand.
