function parseBoolean(value: string | undefined, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseCsv(value: string | undefined) {
  if (!value) {
    return [] as string[];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  corsOrigins: parseCsv(process.env.CORS_ORIGIN),
  rabbitmqUrl:
    process.env.RABBITMQ_URL?.trim() || "amqp://guest:guest@localhost:5672",
  emailQueueName: process.env.EMAIL_QUEUE_NAME?.trim() || "email.send",
  emailQueuePrefetch: Number(process.env.EMAIL_QUEUE_PREFETCH ?? 1),
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
  llmBaseUrl: process.env.LLM_BASE_URL?.trim() || "",
  llmApiKey: process.env.LLM_API_KEY?.trim() || "",
  llmModel: process.env.LLM_MODEL?.trim() || "",
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 20000),
  llmRetryAttempts: Number(process.env.LLM_RETRY_ATTEMPTS ?? 1),
  llmRetryDelayMs: Number(process.env.LLM_RETRY_DELAY_MS ?? 800),
};

export const isUsingDefaultJwtSecret = !process.env.JWT_SECRET?.trim();
