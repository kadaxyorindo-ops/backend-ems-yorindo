import "dotenv/config";
import app from "./app.ts";
import { connectDB, registerDBListeners } from "./config/db.ts";

const port = Number(process.env.PORT ?? 5000);

async function bootstrap(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDB();

    // Register connection lifecycle listeners + graceful shutdown
    registerDBListeners();

    // Start Express server
    app.listen(port, () => {
      console.log(`[APP] Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("[APP] Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
