# Login & Account Setup Guide

Configure the environment variables listed in [`.env.example`](./.env.example) first.

## How accounts work

- Every account has exactly one role: **GAA**, **Administration Officer**, **Evaluating Officer**, **PHI** or **Vice Chancellor**.
- **Self-registration** (`/signup`) only *requests* a role. The new account is created **inactive** and cannot use the
  system until a GAA activates it (and, if needed, changes its role) in **User Management**.
- **Bootstrap:** if no active GAA exists yet, the first person who signs up requesting the GAA role is activated
  immediately, so a fresh installation can be set up. Every later GAA request needs approval.
- People who sign in with a Supabase account that has no profile in the database get an inactive
  Evaluating Officer profile, again pending GAA approval. Nobody is made a GAA automatically.
- Deactivated users are signed out and denied access to every page and API.
- Users with recorded history (evaluations, reports, reviews…) cannot be deleted. Deactivate them instead, so the
  audit trail stays intact.

## Recommended first-time setup

1. Sign up at `/signup` requesting the **GAA** role. As the first GAA you are activated straight away.
2. Create the other accounts in **User Management**, or approve the people who signed up themselves.
3. Create locations and tasks, then assign Evaluating Officers and PHIs to locations.

## Password reset

- **Forgot password** (`/forgot-password`) emails a reset link that opens `/reset-password`.
- In Supabase → **Authentication → URL Configuration**, add `https://YOUR-DOMAIN/reset-password` (and
  `http://localhost:3000/reset-password` for development) to the **Redirect URLs**, otherwise the link is rejected.
- The link must be opened in the same browser the reset was requested from (Supabase PKCE flow). Expired or reused
  links show a message with a button to request a new one. After a successful reset, all sessions are signed out.

## Cleaning workers

GAA users manage workers under **Assignments → Cleaning Workers** (`/gaa/workers`): add workers, assign them to
locations with a monthly allocated amount, change allocations, and remove or deactivate workers. Active assignments
of active workers are the "total workers" PHIs see for a location. Every change is recorded in the audit log.

## Test accounts (development only)

`/init-test-users` (or `npm run seed`) creates one account per role using the passwords defined in
`prisma/test-users.ts`. The passwords are public, so:

- The page needs your Supabase **service role key** and does not display the passwords.
- In production it is disabled unless `ALLOW_TEST_USER_INIT=true`. Enable it only briefly, then delete or
  deactivate the test accounts before real use.

## Monthly reports

- Reports for the previous month are generated automatically on the 1st (see `vercel.json`, 01:00 UTC). This needs
  `CRON_SECRET` and `MONTHLY_REPORT_SYSTEM_ACTOR_ID`.
- A GAA can also run (or re-run) processing for any month from **Monthly Reports → Monthly processing**.
- If daily records are missing, the report stays **incomplete (draft)**. Assigned officers can then open that month
  from the report and fill in the missing days, and a GAA re-runs processing to submit it.
- If Administration requests a **correction**, assigned Evaluating Officers and PHIs can edit that month's daily
  records (including finalized ones; every change is logged with the previous value). An assigned Evaluating Officer
  or a GAA then clicks **Resubmit corrected report** on the report page.

## Troubleshooting

| Message | Meaning |
|---|---|
| "Invalid email or password" | Wrong credentials, or the Supabase account does not exist. |
| "Your account is not active…" | A GAA has to activate the account in User Management. |
| "Server configuration error" | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are missing. Restart the dev server after editing `.env`. |
