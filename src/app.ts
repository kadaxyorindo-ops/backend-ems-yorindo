import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { verifyBrevoSMTP } from "./config/brevo.ts";
import apiRouter from "./routes/index.ts";
import { errorHandler } from "./middlewares/error.middleware.ts";
import authRouter from "./routes/auth.routes.ts";
const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api", apiRouter);

/**
 * Application Health Check
 * Returns: 200 OK if server is running
 */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * Database Health Check
 * Returns: 200 OK + connection info if MongoDB is connected, 503 if disconnected
 */
app.get("/db-health", (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const isConnected = mongoState === 1;
  const statusCode = isConnected ? 200 : 503;

  res.status(statusCode).json({
    status: isConnected ? "ok" : "error",
    database: {
      state: states[mongoState as keyof typeof states] || "unknown",
      host: mongoose.connection.host || "unknown",
      database: mongoose.connection.name || "unknown",
    },
  });
});

/**
 * Brevo SMTP Health Check
 * Returns: 200 OK if SMTP credentials and connection are valid, 503 otherwise
 */
app.get("/brevo-health", async (_req, res) => {
  const result = await verifyBrevoSMTP();

  if (!result.ok) {
    return res.status(503).json({
      status: "error",
      provider: "brevo",
      message: result.message,
      error: result.error,
    });
  }

  return res.status(200).json({
    status: "ok",
    provider: "brevo",
    smtp: {
      host: result.host,
      port: result.port,
      secure: result.secure,
      user: result.user,
      fromEmail: result.fromEmail,
      fromName: result.fromName,
    },
  });
});

// --- API routes ---
app.use("/api/v1", apiRouter);
app.use("/api/v1/auth", authRouter);

// -- Global Errorhandler
app.use(errorHandler);

export default app;
