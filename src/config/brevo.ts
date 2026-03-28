import nodemailer from "nodemailer";

export type BrevoCheckResult =
  | {
      ok: true;
      host: string;
      port: number;
      secure: boolean;
      user: string;
    }
  | {
      ok: false;
      message: string;
      error?: string;
    };

export async function verifyBrevoSMTP(): Promise<BrevoCheckResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = String(process.env.SMTP_SECURE).toLowerCase() === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return {
      ok: false,
      message: "SMTP env is incomplete. Check SMTP_HOST, SMTP_USER, SMTP_PASS.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    await transporter.verify();

    return { ok: true, host, port, secure, user };
  } catch (error) {
    return {
      ok: false,
      message: "Failed to connect to Brevo SMTP",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
