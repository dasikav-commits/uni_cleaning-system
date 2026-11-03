# Login & Account Setup Guide

Configure the environment variables listed in [`.env.example`](./.env.example) first.

## How accounts work

- Every account has exactly one login type: **Deputy Registrar**, **PHI**, **Faculty Coordinator**,
  **Sub-Warden**, **Curator** or **Unit Officer**. The Deputy Registrar (DR) is the administrator.
- A login only sees the locations the DR assigned to it in **Set-up → Location assignments**.
  The DR sees every location.
- Sign-in is by e-mail and password through Supabase Auth. Supabase stores only salted bcrypt
  hashes of the passwords, and the session cookies are HTTP-only. Passwords need at least 8 characters.
- **Self-registration** (`/signup`) only *requests* a login type. The account is created **inactive**, and the person
  must verify their e-mail address. The DR then activates it (and can change the login type) in **Set-up → Logins**.
- **Bootstrap:** if there is no active Deputy Registrar yet, the first person who signs up requesting that role
  is activated immediately, so a fresh installation can be set up.
- Accounts created by the DR in **Logins** are active and already e-mail-verified.
- People who sign in with a Supabase account that has no profile get an inactive Unit Officer profile, pending DR approval.
- Deactivated users are signed out and denied access to every page and API. Users with recorded history cannot be
  deleted; deactivate them instead so the audit trail stays intact.

## Supabase settings (one-time)

In the Supabase dashboard:

1. **Authentication → Sign In / Providers → Email**: turn on **Confirm email**.
2. **Authentication → URL Configuration → Redirect URLs**: add
   - `https://YOUR-DOMAIN/login?verified=1` and `https://YOUR-DOMAIN/reset-password`,
   - and for development `http://localhost:3000/login?verified=1` and `http://localhost:3000/reset-password`.
3. **Authentication → Emails → SMTP Settings**: configure your own SMTP server. Supabase's built-in mailer only sends
   a few e-mails per hour, which is not enough for verification and reset e-mails.

## E-mail verification

- After sign-up the person gets a verification e-mail. The link opens `/login?verified=1`.
- Signing in before verifying shows a message with **Send the verification email again**.

## Password reset

- **Forgot password** (`/forgot-password`) e-mails a reset link that opens `/reset-password`.
- The link must be opened in the same browser the reset was requested from (Supabase PKCE flow). Expired or reused
  links show a message with a button to request a new one. After a successful reset, all sessions are signed out.

## Notifications

In-app notifications (`/notifications`) are created when a report is sent to the DR, returned for correction,
accepted, or when the monthly payment report is finalized. If `SMTP_HOST` is set, the same messages are e-mailed.

## Test accounts (development only)

`/init-test-users` (or `npm run seed`) creates one login of every kind from `prisma/test-users.ts` (shared password
`Clean@2026`) and assigns them to their Kuliyapitiya locations. `npm run seed` also loads the BOQ.

- The page needs your Supabase **service role key**.
- In production it is disabled unless `ALLOW_TEST_USER_INIT=true`. Enable it only briefly, then delete or
  deactivate the test accounts before real use.

## Troubleshooting

| Message | Meaning |
|---|---|
| "Invalid email or password" | Wrong credentials, or the Supabase account does not exist. |
| "Please verify your email address first" | Open the link in the verification e-mail, or send it again. |
| "Your account is not active…" | The Deputy Registrar has to activate the account in Set-up → Logins. |
| "Server configuration error" | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are missing. Restart the dev server after editing `.env`. |
