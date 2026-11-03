# University Cleaning Monitoring System

Monthly monitoring and payment of the **Cleaning & Janitorial Services** contract at the
Kuliyapitiya premises. It follows the client's own formats: evaluation reports per BOQ
service, the PHI attendance, the "Amount of work done" sheet, the Attendance report and
the final Cleaning & Janitorial Services report.

Built with Next.js 16 (App Router), Prisma 7 on PostgreSQL (Supabase) and Supabase Auth.

## Logins

| Login | Reports on | Home |
| --- | --- | --- |
| **Deputy Registrar (DR)** | Everything; administrator (users, locations, BOQ, assignments) | `/dr` |
| **PHI** | Main Administration Building, Garbage, Toilet Pits, Dogs & Cats; daily + monthly attendance | `/reports` |
| **Faculty Coordinator** | One faculty each (FBSF, FAS, FOT, ELT) | `/reports` |
| **Sub-Warden** (4) | The halls assigned to them | `/reports` |
| **Curator** | Land, Roads & Landscape | `/reports` |
| **Unit Officer** | One unit each (Auditorium, Gym, Library, Canteens, ...) | `/reports` |

Each login sees only the locations the DR has assigned to it (**Set-up → Location assignments**).

## Monthly process

1. **Evaluation reports**: every login fills in an *Evaluation cleaning report for cleaning services*
   for each of its locations, row by row, then sends it to the DR. The DR accepts it or returns it.
   - **Tick format** (most services): click a row to open a pop-up listing each scheduled occurrence
     (each day for Daily items, AM/PM for twice-daily items, each week for Weekly items, ...). Ticked = done (green).
     Deduction % = missed ÷ scheduled. A new row opens with every occurrence ticked (100%), so you only untick what was missed.
   - **Rate based** (Toilet Pits, Dogs & Cats): enter the quantity done (and any fined quantity); amount = quantity × rate.
2. **PHI attendance**: the PHI keeps the daily attendance sheet, loads the month's totals into the
   monthly attendance report and sends it to the DR, who approves it or asks for a correction.
3. **Main Administration Building**: report from the PHI (step 1, Administration category).
4. **Amount of work done**: generated from the accepted evaluation reports (Excel export).
5. **Attendance report**: deduction for absence, taken from the approved PHI attendance (Excel export).
6. **Cleaning & Janitorial Services report**: Amount as per BOQ / Invoice / Approved per service,
   less the deduction for absence = amount payable. The DR finalizes it (figures are frozen) and can reopen it with a reason.

Approved amount of a location = Σ(item amount − item amount × deduction %).

## Setup

```bash
npm install
npx prisma generate
npm run dev
```

### Environment (`.env`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | PostgreSQL (Supabase pooled / direct) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side user management (DR creates logins), seeding |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_SECURE` | Optional: e-mail notifications (report sent / returned / accepted / finalized). Without `SMTP_HOST` only in-app notifications are created. |
| `APP_URL` | Public URL used for links in e-mails, e.g. `https://cleaning.example.ac.lk` |

`CRON_SECRET` and `MONTHLY_REPORT_SYSTEM_ACTOR_ID` are no longer used.

### Database

New migrations live in `prisma/migrations/`. To apply one through the Supabase SQL Editor, paste the
contents of its `migration.sql` and run it. Then mark it as applied so Prisma's history stays in step:

```bash
npx prisma migrate resolve --applied 20261102_dr_boq_evaluation_reports
```

### First run

1. Sign in as the Deputy Registrar. On a fresh database, the first person to sign up requesting the
   Deputy Registrar role is activated straight away.
2. **Set-up → BOQ & locations → Load Kuliyapitiya BOQ** creates the 28 services with their items. It is safe to run again.
   Then enter the Toilet Pit rates; the Daycare item amounts are also missing from the sheets.
3. **Set-up → Logins**: create the logins (users created by the DR are already e-mail-verified).
4. **Set-up → Location assignments**: give each login its locations.

For testing, `npm run seed` (or `/init-test-users`) creates one login of every kind
(see `prisma/test-users.ts`, password `Clean@2026`), loads the BOQ and assigns the locations.
Never use these accounts in production.

### Checks

```bash
npx tsc --noEmit
npx eslint .
npx vitest run
```

See [LOGIN_SETUP_GUIDE.md](LOGIN_SETUP_GUIDE.md) for sign-up, e-mail verification and password reset.
