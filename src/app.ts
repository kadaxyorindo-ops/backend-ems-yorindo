import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

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

export default app;
