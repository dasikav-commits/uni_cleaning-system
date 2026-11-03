# University Cleaning Monitoring System - Project Summary

**Framework**: Next.js 16.4 (App Router, TypeScript) · **Database**: PostgreSQL (Supabase) · **ORM**: Prisma 7.9 ·
**Auth**: Supabase Auth (e-mail + password, e-mail verification) · **Styling**: Tailwind CSS v4 · **Exports**: exceljs

Built around the client's formats for the Kuliyapitiya premises (March sheets + BOQ). See [README.md](README.md) for the
monthly process and setup.

## Data model (new tables)

| Model | Purpose |
| --- | --- |
| `Location` | A BOQ service (1-28): code `KUL-NN`, `boqNumber`, `category` (FACULTY, ADMINISTRATION, HALL, COMMON_UNIT, LANDSCAPE, EXTERNAL_SERVICE), `evaluationFormat` (SCHEDULED / RATE_BASED), optional fixed `boqAmount` |
| `BoqItem` | BOQ line: item no./sub item, description, `frequency`, `monthlyAmount`, or `unitRate` / `plannedPerYear` / `penaltyRate` for rate-based services |
| `ReportingAssignment` | Which login reports on which location |
| `EvaluationReport` / `EvaluationReportRow` | Monthly report per location (DRAFT → SUBMITTED → ACCEPTED / RETURNED) with a snapshot of the BOQ rows, ticked occurrences, deduction % and amounts |
| `PhiDailyAttendance` | PHI daily sheet (half days / absences by category) |
| `PhiMonthlyAttendanceReport` | PHI monthly attendance (existing table), now reviewed by the DR |
| `MonthlyPaymentReport` / `MonthlyPaymentReportLine` | Cleaning & Janitorial Services report (DRAFT / FINALIZED), frozen per location on finalize |

Tables of the earlier workflow are kept (not dropped) with their data.

## Business logic (`lib/`)

| File | Purpose |
| --- | --- |
| `application-roles.ts` | Logins, labels, location categories |
| `periods.ts` | Month handling (`YYYY-MM`) |
| `evaluation-calc.ts` | Occurrences per frequency, deduction % = missed ÷ scheduled, rate-based totals, money in cents |
| `boq-catalog.ts` / `boq-management.ts` | Kuliyapitiya BOQ (28 services) and its idempotent import; location / item editing |
| `reporting-assignments.ts` | Location access per login |
| `evaluation-reports.ts` | Start / fill / submit / review / accept-all / sync with BOQ |
| `phi-daily-attendance.ts`, `phi-monthly-attendance.ts` | PHI attendance |
| `monthly-process.ts` | 6-step overview, Amount of work done, Attendance report, payment report, finalize / reopen |
| `report-exports.ts` | Excel workbooks |
| `notifications.ts`, `email.ts` | In-app notifications + optional SMTP e-mails |

## Pages

| Path | Who |
| --- | --- |
| `/reports` | Reporting logins: their locations for the month, grouped by category |
| `/evaluations/[id]` | Evaluation cleaning report editor (tick pop-up / rate inputs, submit, DR accept / return) |
| `/phi/daily-attendance`, `/phi/monthly-attendance` | PHI |
| `/dr` | DR: monthly process overview |
| `/dr/evaluations` | DR: all reports by category, accept all |
| `/dr/phi-attendance` | DR: review PHI attendance |
| `/dr/reports/work-done`, `/dr/reports/attendance`, `/dr/reports/final` | DR: the three reports (print + Excel) |
| `/dr/boq`, `/dr/users`, `/dr/assignments`, `/dr/audit` | DR set-up |
| `/notifications`, `/profile` | Everyone |

## API

- `POST /api/evaluations` start or open a report; `GET /api/evaluations/[id]`; `PATCH /api/evaluations/[id]/rows/[rowId]`;
  `POST /api/evaluations/[id]/submit | sync | review`
- `GET|PUT /api/phi/daily-attendance`, `GET|POST /api/phi/monthly-attendance`
- DR: `/api/dr/evaluations/accept-all`, `/api/dr/boq/import`, `/api/dr/locations[/id[/items]]`, `/api/dr/boq-items/[id]`,
  `/api/dr/assignments`, `/api/dr/payment-report`, `/api/dr/phi-attendance/[id]`, `/api/dr/reports/[kind]?period=` (xlsx),
  `/api/dr/users[/id]`

## Tests

`npx vitest run`: calculation, BOQ catalog (the totals match the BOQ: Rs. 7,398,637.98 a month), PHI attendance and
user management.
