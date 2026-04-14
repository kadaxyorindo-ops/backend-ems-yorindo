import nodemailer from "nodemailer";
import { env } from "./env";

export type BrevoCheckResult =
  | {
      ok: true;
      host: string;
      port: number;
      secure: boolean;
      user: string;
      fromEmail: string;
      fromName: string;
    }
  | {
      ok: false;
      message: string;
      error?: string;
    };

export async function verifyBrevoSMTP(): Promise<BrevoCheckResult> {
  const host = env.smtpHost;
  const port = env.smtpPort;
  const secure = env.smtpSecure;
  const user = env.smtpUser;
  const pass = env.smtpPass;

  if (!host || !user || !pass) {
    return {
      ok: false,
      message: "SMTP env is incomplete. Check SMTP_HOST, SMTP_USER, SMTP_PASS.",
    };
  }

  try {
    const transporter = createBrevoTransporter();

    await transporter.verify();

    return {
      ok: true,
      host,
      port,
      secure,
      user,
      fromEmail: env.mailFromEmail,
      fromName: env.mailFromName,
    };
  } catch (error) {
    return {
      ok: false,
      message: "Failed to connect to Brevo SMTP",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function createBrevoTransporter() {
  const host = env.smtpHost;
  const port = env.smtpPort;
  const secure = env.smtpSecure;
  const user = env.smtpUser;
  const pass = env.smtpPass;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP env is incomplete. Check SMTP_HOST, SMTP_USER, SMTP_PASS.",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: env.smtpStartTls,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    tls: {
      rejectUnauthorized: !env.skipSmtpVerify,
    },
  });
}
