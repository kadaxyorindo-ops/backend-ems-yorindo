import "dotenv/config";
import { networkInterfaces } from "node:os";
import app from "./app.ts";
import { verifyBrevoSMTP } from "./config/brevo.ts";
import { connectDB, registerDBListeners } from "./config/db.ts";
import { env, isUsingDefaultJwtSecret } from "./config/env.ts";
import {
  startEmailQueueConsumer,
  verifyEmailQueueConnection,
  type EmailQueueJob,
} from "./services/email-queue.service.ts";
import { processQueuedCommunicationCampaign } from "./services/communication.service.ts";
import { processQueuedRegistrationTicketEmail } from "./services/registration-ticket.service.ts";

const port = env.port;

function getNetworkUrls(portNumber: number): string[] {
  const nets = networkInterfaces();
  const urls: string[] = [];

  for (const list of Object.values(nets)) {
    if (!list) {
      continue;
    }

    for (const item of list) {
      if (item.family === "IPv4" && !item.internal) {
        urls.push(`http://${item.address}:${portNumber}/`);
      }
    }
  }

  return [...new Set(urls)];
}

function logServerReady(portNumber: number): void {
  const localUrl = `http://localhost:${portNumber}/`;
  const networkUrls = getNetworkUrls(portNumber);

  console.log("\n🚀 EMS Backend ready");
  console.log(`  ➜  Local:   ${localUrl}`);

  if (networkUrls.length > 0) {
    console.log(`  ➜  Network: ${networkUrls[0]}`);
  } else {
    console.log("  ➜  Network: no external interface detected");
  }

  console.log(`  ➜  Health:  ${localUrl}health`);
  console.log(`  ➜  DB:      ${localUrl}db-health`);
  console.log(`  ➜  Brevo:   ${localUrl}brevo-health`);
  console.log(`  ➜  Queue:   ${localUrl}queue-health\n`);
}

function processQueuedEmailJob(job: EmailQueueJob) {
  if (job.type === "communication-campaign") {
    return processQueuedCommunicationCampaign(job.campaignId);
  }

  return processQueuedRegistrationTicketEmail(job.registrationId);
}

async function checkBrevoOnStartup(): Promise<void> {
  const result = await verifyBrevoSMTP();

  if (result.ok) {
    console.log(
      `[BREVO] SMTP verified successfully. Host: ${result.host} | Port: ${result.port} | User: ${result.user} | From: ${result.fromName} <${result.fromEmail}>`,
    );
    return;
  }

  console.warn(
    `[BREVO] SMTP check failed: ${result.message}${result.error ? ` | ${result.error}` : ""}`,
  );
}

async function checkEmailQueueOnStartup(): Promise<void> {
  const result = await verifyEmailQueueConnection();

  if (result.ok) {
    console.log(
      `[QUEUE] RabbitMQ verified successfully. URL: ${result.url} | Queue: ${result.queueName} | Consumer started: ${result.consumerStarted ? "yes" : "no"}`,
    );
    return;
  }

  console.warn(
    `[QUEUE] RabbitMQ check failed: ${result.error ?? "Unknown RabbitMQ error."}`,
  );
}

async function bootstrap(): Promise<void> {
  try {
    if (isUsingDefaultJwtSecret) {
      console.warn(
        "[AUTH] JWT_SECRET tidak ditemukan. Menggunakan secret development fallback. Ganti sebelum dipakai di production.",
      );
    }

    if (env.mailFromEmail.endsWith("@smtp-brevo.com")) {
      console.warn(
        `[BREVO] Sender aktif masih memakai alamat login SMTP (${env.mailFromEmail}). Ini sering lolos SMTP verify tetapi gagal deliver ke inbox. Pakai sender terverifikasi seperti domain bisnis Anda melalui SMTP_FROM atau MAIL_FROM_EMAIL.`,
      );
    }

    await connectDB();
    registerDBListeners();

    try {
      await startEmailQueueConsumer(async (job) => {
        await processQueuedEmailJob(job);
      });
    } catch (error) {
      console.warn("[QUEUE] Email consumer failed to start:", error);
    }

    app.listen(port, () => {
      void checkBrevoOnStartup();
      void checkEmailQueueOnStartup();
      logServerReady(port);
    });
  } catch (error) {
    console.error("[APP] Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
