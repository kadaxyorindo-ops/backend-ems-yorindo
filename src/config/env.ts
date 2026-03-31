function parseBoolean(value: string | undefined, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  jwtSecret:
    process.env.JWT_SECRET?.trim() || "ems-yorindo-dev-secret-change-me",
  jwtExpiresInHours: Number(process.env.JWT_EXPIRES_IN_HOURS ?? 8),
  otpExpiresInMinutes: Number(process.env.OTP_EXPIRES_IN_MINUTES ?? 5),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
  otpResendCooldownSeconds: Number(
    process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60,
  ),
  smtpHost: process.env.SMTP_HOST?.trim() || "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: parseBoolean(process.env.SMTP_SECURE, false),
  smtpStartTls: parseBoolean(process.env.SMTP_STARTTLS, false),
  skipSmtpVerify: parseBoolean(process.env.SKIP_SMTP_VERIFY, false),
  smtpUser: process.env.SMTP_USER?.trim() || "",
  smtpPass:
    process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim() || "",
  mailFromName:
    process.env.MAIL_FROM_NAME?.trim() ||
    process.env.SMTP_FROM_NAME?.trim() ||
    "Yorindo EMS",
  mailFromEmail:
    process.env.MAIL_FROM_EMAIL?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "",
};

export const isUsingDefaultJwtSecret = !process.env.JWT_SECRET?.trim();
