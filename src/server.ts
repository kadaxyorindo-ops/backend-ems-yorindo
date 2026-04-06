import "dotenv/config";
import { networkInterfaces } from "node:os";
import app from "./app.ts";
import { connectDB, registerDBListeners } from "./config/db.ts";
import { verifyBrevoSMTP } from "./config/brevo.ts";
import { env, isUsingDefaultJwtSecret } from "./config/env.ts";

const port = env.port;

function getNetworkUrls(portNumber: number): string[] {
  const nets = networkInterfaces();
  const urls: string[] = [];

  for (const list of Object.values(nets)) {
    if (!list) continue;

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
  console.log(`  ➜  Brevo:   ${localUrl}brevo-health\n`);
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

    // Connect to MongoDB
    await connectDB();

    // Register connection lifecycle listeners + graceful shutdown
    registerDBListeners();

    // Start Express server
    app.listen(port, () => {
      void checkBrevoOnStartup();
      logServerReady(port);
    });
  } catch (error) {
    console.error("[APP] Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
