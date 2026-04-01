import { createBrevoTransporter } from "../config/brevo.ts";
import { env } from "../config/env.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderLoginOtpEmail(name: string, otp: string) {
  const safeName = escapeHtml(name);
  const expiryMinutes = env.otpExpiresInMinutes;

  const subject = "Kode OTP Login Anda - Yorindo EMS";
  const html = `<!doctype html>
<html lang="id">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px dashed #94a3b8;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 16px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;font-weight:700;">
                  Yorindo EMS
                </p>
                <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#0f172a;">
                  Kode OTP Login Anda
                </h1>
                <p style="margin:0;font-size:15px;line-height:1.8;color:#475569;">
                  Halo ${safeName}, masukkan kode berikut untuk login ke dashboard EMS Yorindo.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 12px;">
                <div style="border:1px solid #cbd5e1;border-radius:20px;background:#f8fafc;padding:24px;text-align:center;">
                  <div style="font-family:'SFMono-Regular','Roboto Mono',monospace;font-size:36px;letter-spacing:10px;font-weight:700;color:#0f172a;">
                    ${otp}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#475569;">
                  Kode ini berlaku selama <strong>${expiryMinutes} menit</strong> dan hanya bisa dipakai satu kali.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.7;color:#94a3b8;">
                  Jika Anda tidak merasa meminta login, abaikan email ini.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  const text = `Halo ${name}, kode OTP login Anda adalah ${otp}. Kode berlaku ${expiryMinutes} menit.`;

  return { subject, html, text };
}

export async function sendLoginOtpEmail(params: {
  to: string;
  name: string;
  otp: string;
}) {
  const { subject, html, text } = renderLoginOtpEmail(params.name, params.otp);
  const transporter = createBrevoTransporter();

  const result = await transporter.sendMail({
    from: `"${env.mailFromName}" <${env.mailFromEmail}>`,
    to: params.to,
    subject,
    html,
    text,
  });

  console.log("[EMAIL] OTP email send attempt", {
    to: params.to,
    from: env.mailFromEmail,
    messageId: result.messageId,
    accepted: result.accepted,
    rejected: result.rejected,
    response: result.response,
  });

  if (Array.isArray(result.rejected) && result.rejected.length > 0) {
    throw new Error(
      `SMTP rejected recipient: ${result.rejected.map(String).join(", ")}`,
    );
  }

  if (Array.isArray(result.accepted) && result.accepted.length === 0) {
    throw new Error("SMTP did not accept the message for delivery.");
  }
}

export async function sendCampaignEmail(params: {
  recipients: Array<{ email: string; name: string }>;
  subject: string;
  html: string;
  text: string;
}) {
  const transporter = createBrevoTransporter();
  const uniqueRecipients = Array.from(
    new Map(params.recipients.map((recipient) => [recipient.email, recipient])).values(),
  );
  const failures: Array<{ email: string; reason: string }> = [];
  let successCount = 0;

  for (const recipient of uniqueRecipients) {
    try {
      const result = await transporter.sendMail({
        from: `"${env.mailFromName}" <${env.mailFromEmail}>`,
        to: recipient.email,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      if (Array.isArray(result.rejected) && result.rejected.length > 0) {
        failures.push({
          email: recipient.email,
          reason: `SMTP rejected recipient: ${result.rejected.map(String).join(", ")}`,
        });
        continue;
      }

      if (Array.isArray(result.accepted) && result.accepted.length === 0) {
        failures.push({
          email: recipient.email,
          reason: "SMTP did not accept the message for delivery.",
        });
        continue;
      }

      successCount += 1;
    } catch (error) {
      failures.push({
        email: recipient.email,
        reason:
          error instanceof Error ? error.message : "Unknown SMTP delivery error.",
      });
    }
  }

  return {
    successCount,
    failureCount: failures.length,
    failures,
  };
}
