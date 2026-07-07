import "server-only";
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    // No SMTP configured (local/dev): log instead of sending, so the code
    // path is exercised identically without requiring local mail infra.
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return transporter;
}

export async function sendMail(params: { to: string; subject: string; text: string }) {
  const info = await getTransporter().sendMail({
    from: process.env.SMTP_FROM || "no-reply@example.com",
    to: params.to,
    subject: params.subject,
    text: params.text,
  });

  if (!process.env.SMTP_HOST) {
    console.log(`[mailer] (no SMTP configured, not actually sent) to=${params.to} subject=${params.subject}`);
  }

  return info;
}
