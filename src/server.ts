import "dotenv/config";
import { networkInterfaces } from "node:os";
import app from "./app.ts";
import { connectDB, registerDBListeners } from "./config/db.ts";
import { verifyBrevoSMTP } from "./config/brevo.ts";

const port = Number(process.env.PORT ?? 5000);

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
      `[BREVO] SMTP verified successfully. Host: ${result.host} | Port: ${result.port} | User: ${result.user}`,
    );
    return;
  }

  console.warn(
    `[BREVO] SMTP check failed: ${result.message}${result.error ? ` | ${result.error}` : ""}`,
  );
}

async function bootstrap(): Promise<void> {
  try {
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
