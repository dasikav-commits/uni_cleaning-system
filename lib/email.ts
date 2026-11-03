import { after } from "next/server";

/**
 * Notification e-mails.
 *
 * Sign-in, e-mail verification and password reset e-mails are sent by Supabase
 * Auth (configure SMTP in Supabase > Authentication > Emails). The workflow
 * e-mails below (report submitted / returned / accepted, payment report
 * finalized) are sent by the app through any SMTP server when these variables
 * are set:
 *
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASSWORD,
 *   SMTP_FROM (e.g. "Cleaning Monitoring <no-reply@wyb.ac.lk>"),
 *   SMTP_SECURE=true for port 465 (TLS from the start; 587 uses STARTTLS),
 *   APP_URL (e.g. https://cleaning.wyb.ac.lk) for the links in the e-mails.
 *
 * Without SMTP_HOST nothing is sent and only in-app notifications are created.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  /** App path the e-mail links to, e.g. "/evaluations/abc". */
  link?: string;
};

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function appUrl(path: string) {
  const base = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}${path}` : path;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}

async function createTransport() {
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    // Never send credentials or report data over an unencrypted connection.
    requireTLS: !(process.env.SMTP_SECURE === "true" || port === 465),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" } : undefined,
  });
}

export async function sendEmails(messages: readonly EmailMessage[]) {
  if (!messages.length || !isEmailConfigured()) return { sent: 0 };
  const transport = await createTransport();
  let sent = 0;
  for (const message of messages) {
    const link = message.link ? appUrl(message.link) : null;
    const text = link ? `${message.text}\n\nOpen: ${link}` : message.text;
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#0f172a">
<p style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#64748b">University Cleaning Monitoring System</p>
${message.text
  .split("\n")
  .map((line) => `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`)
  .join("")}
${link ? `<p style="margin-top:16px"><a href="${escapeHtml(link)}" style="background:#0f172a;color:#fff;padding:10px 16px;border-radius:12px;text-decoration:none">Open in the system</a></p>` : ""}
</div>`;
    try {
      await transport.sendMail({ from: process.env.SMTP_FROM, to: message.to, subject: message.subject, text, html });
      sent += 1;
    } catch (error) {
      console.error(`Notification e-mail to ${message.to} failed`, error);
    }
  }
  return { sent };
}

/**
 * Sends the e-mails after the response has been returned, so a slow or broken
 * SMTP server never delays or fails the user's action. Only call this inside a
 * route handler or server function.
 */
export function queueEmails(messages: readonly EmailMessage[] | undefined) {
  if (!messages?.length || !isEmailConfigured()) return;
  after(async () => {
    await sendEmails(messages);
  });
}
