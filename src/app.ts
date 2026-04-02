import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { verifyBrevoSMTP } from "./config/brevo.ts";
import {
  getEmailQueueHealthSnapshot,
  verifyEmailQueueConnection,
} from "./services/email-queue.service.ts";
import apiRouter from "./routes/index.ts";
import authRouter from "./routes/auth.routes.ts";
import communicationRouter from "./routes/communication.routes.ts";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware.ts";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/db-health", (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const isConnected = mongoState === 1;

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? "ok" : "error",
    database: {
      state: states[mongoState as keyof typeof states] || "unknown",
      host: mongoose.connection.host || "unknown",
      database: mongoose.connection.name || "unknown",
    },
  });
});

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

app.get("/queue-health", async (_req, res) => {
  const snapshot = getEmailQueueHealthSnapshot();
  const result = snapshot.connected
    ? snapshot
    : await verifyEmailQueueConnection();

  if (!result.ok) {
    return res.status(503).json({
      status: "error",
      provider: "rabbitmq",
      queue: {
        url: result.url,
        name: result.queueName,
        connected: result.connected,
        consumerStarted: result.consumerStarted,
      },
      message: result.error,
    });
  }

  return res.status(200).json({
    status: "ok",
    provider: "rabbitmq",
    queue: {
      url: result.url,
      name: result.queueName,
      connected: result.connected,
      consumerStarted: result.consumerStarted,
    },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/communications", communicationRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
