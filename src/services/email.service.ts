import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createBrevoTransporter } from "../config/brevo.ts";
import { env } from "../config/env.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, "../assets/yorindo-logo.png");

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

  const subject = "Your Login Verification Code \u2014 Yorindo EMS";
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>Login Verification \u2014 Yorindo EMS</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:48px 16px 40px;">

        <!-- Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;">

          <!-- Header: dark navy with white card behind logo -->
          <tr>
            <td align="center" style="padding:28px 40px;background-color:#0c1b45;">
              <div style="display:inline-block;background-color:#ffffff;border-radius:14px;padding:14px 28px;">
                <img src="cid:yorindo-logo" alt="Yorindo Communication" width="140" style="display:block;width:140px;max-width:140px;height:auto;border:0;" />
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px 8px;">

              <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;line-height:1;">
                Login Verification
              </p>

              <h1 style="margin:0 0 14px;font-size:24px;font-weight:700;line-height:1.25;color:#0f172a;">
                Your Verification Code
              </h1>

              <p style="margin:0 0 28px;font-size:15px;line-height:1.8;color:#475569;">
                Hi <strong style="color:#0f172a;">${safeName}</strong>,<br>
                use the code below to sign in to your Yorindo EMS dashboard.
              </p>

              <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;line-height:1;">
                6-Digit Code
              </p>

              <!-- OTP code — centered, no boxes -->
              <p style="margin:0 0 28px;text-align:center;font-size:40px;font-weight:700;letter-spacing:0.25em;color:#0c1b45;">${otp}</p>

              <!-- Expiry -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
                <tr>
                  <td style="background-color:#f8fafc;border-left:3px solid #1a40a8;border-radius:4px;padding:12px 16px;">
                    <p style="margin:0;font-size:13px;line-height:1.7;color:#475569;">
                      This code expires in <strong style="color:#0f172a;">${expiryMinutes} minutes</strong> and can only be used once.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0;font-size:13px;line-height:1.7;color:#94a3b8;">
                Never share this code with anyone<br>
                If you did not request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #f1f5f9;padding:18px 40px;background-color:#f8fafc;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                      Sent to the email address registered with Yorindo EMS.
                    </p>
                  </td>
                  <td align="right" style="vertical-align:middle;white-space:nowrap;">
                    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#cbd5e1;">Yorindo EMS</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom colour stripe -->
          <tr>
            <td style="padding:0;font-size:0;line-height:0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="height:5px;background-color:#6B3FA0;font-size:1px;line-height:1px;">&nbsp;</td>
                  <td style="height:5px;background-color:#2B5EAB;font-size:1px;line-height:1px;">&nbsp;</td>
                  <td style="height:5px;background-color:#43B049;font-size:1px;line-height:1px;">&nbsp;</td>
                  <td style="height:5px;background-color:#EA4C1B;font-size:1px;line-height:1px;">&nbsp;</td>
                  <td style="height:5px;background-color:#F5A623;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
  const text = `Hi ${name}, your Yorindo EMS login code is: ${otp}. It expires in ${expiryMinutes} minutes. Never share this code with anyone.`;

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
    attachments: [
      {
        filename: "yorindo-logo.png",
        content: readFileSync(LOGO_PATH),
        cid: "yorindo-logo",
      },
    ],
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
