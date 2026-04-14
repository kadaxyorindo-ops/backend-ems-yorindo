import "dotenv/config";
import { networkInterfaces } from "node:os";
import app from "./app";
import { verifyBrevoSMTP } from "./config/brevo";
import { connectDB, registerDBListeners } from "./config/db";
import { env, isUsingDefaultJwtSecret } from "./config/env";
import {
  startEmailQueueConsumer,
  verifyEmailQueueConnection,
  type EmailQueueJob,
} from "./services/email-queue.service";
import { processQueuedCommunicationCampaign } from "./services/communication.service";
import { processQueuedRegistrationTicketEmail } from "./services/registration-ticket.service";

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
        "[AUTH] JWT_SECRET not found. Using development fallback secret. Replace before using in production.",
      );
    }

    if (env.mailFromEmail.endsWith("@smtp-brevo.com")) {
      console.warn(
        `[BREVO] Active sender still uses the SMTP login address (${env.mailFromEmail}). This often passes SMTP verification but fails delivery to the inbox. Use a verified sender such as your business domain via SMTP_FROM or MAIL_FROM_EMAIL.`,
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
