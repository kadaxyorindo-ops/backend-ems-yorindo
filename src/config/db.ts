/**
 * @file db.ts
 * @description MongoDB connection utility for the standalone Express/Node.js server.
 *
 * This file is responsible for one thing only: establishing and managing the
 * Mongoose connection to MongoDB. It is NOT responsible for starting the
 * Express server — that stays in server.ts/app.ts.
 *
 * Usage:
 *   import { connectDB } from "./db";
 *   await connectDB(); // call this once before app.listen()
 *
 * Connection strategy:
 *   - Connects once at server startup.
 *   - Mongoose internally manages a connection pool — you do not need to
 *     call connectDB() again per request.
 *   - If the connection drops, Mongoose will automatically attempt to
 *     reconnect (controlled by the options below).
 *   - If the initial connection fails, the process exits — there is no
 *     point running the server without a database.
 */

import dotenv from 'dotenv';
import mongoose from "mongoose";

dotenv.config();

/**
 * Establishes the Mongoose connection to MongoDB.
 * Call this once at application startup, before app.listen().
 *
 * @throws Will call process.exit(1) if the initial connection fails.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  // Guard: fail fast if the connection string is missing entirely.
  // A missing URI is always a configuration error, not a runtime error.
  if (!uri) {
    console.error(
      "[DB] MONGODB_URI is not defined. " +
      "Make sure your .env file exists and is loaded before connectDB() is called."
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      /**
       * serverSelectionTimeoutMS (default: 30000ms)
       * How long Mongoose waits to find an available MongoDB server
       * before throwing a timeout error on the initial connect attempt.
       * 5 seconds is generous for a local instance — if your local
       * MongoDB isn't responding in 5 seconds, something is wrong.
       */
      serverSelectionTimeoutMS: 5_000,

      /**
       * socketTimeoutMS (default: 0 — no timeout)
       * How long an individual operation (query, insert, etc.) can run
       * before Mongoose closes the socket and throws an error.
       * 45 seconds covers even heavy aggregation queries.
       */
      socketTimeoutMS: 45_000,

      /**
       * maxPoolSize (default: 5)
       * Maximum number of concurrent connections in the connection pool.
       * 10 is a safe default for local development.
       */
      maxPoolSize: 10,
    });

    console.log(
      `[DB] Connected to MongoDB successfully. ` +
      `Host: ${mongoose.connection.host} | ` +
      `Database: ${mongoose.connection.name}`
    );

  } catch (error) {
    // Log the full error for debugging, then exit.
    // We exit here because the server is useless without a DB connection.
    console.error("[DB] Initial connection to MongoDB failed:", error);
    console.error(
      "[DB] Troubleshooting tips for local MongoDB:\n" +
      "  1. Check MongoDB is running:  sudo systemctl status mongod\n" +
      "  2. Start it if stopped:        sudo systemctl start mongod\n" +
      "  3. Verify MONGODB_URI in .env (e.g. mongodb://127.0.0.1:27017/xyz_ems)\n" +
      "  4. Check MongoDB logs:         sudo journalctl -u mongod --no-pager | tail -20"
    );
    process.exit(1);
  }
}

/**
 * Registers Mongoose connection lifecycle event listeners.
 * Call this once at startup (after connectDB) to get visibility into
 * connection state changes during the server's lifetime.
 *
 * These events fire on the existing connection — not on reconnect attempts —
 * so they are useful for logging and alerting purposes.
 *
 * Usage:
 *   registerDBListeners();
 */
export function registerDBListeners(): void {
  const conn = mongoose.connection;

  conn.on("connected", () => {
    console.log("[DB] Mongoose connection established.");
  });

  conn.on("disconnected", () => {
    // This fires when the connection is lost unexpectedly.
    // Mongoose will attempt to reconnect automatically.
    console.warn("[DB] Mongoose disconnected. Attempting to reconnect...");
  });

  conn.on("reconnected", () => {
    console.log("[DB] Mongoose reconnected successfully.");
  });

  conn.on("error", (error) => {
    // Fires on connection-level errors (not query errors).
    // Log for visibility — Mongoose handles reconnection internally.
    console.error("[DB] Mongoose connection error:", error);
  });

  /**
   * Graceful shutdown — close the DB connection when the process is
   * terminated (SIGINT = Ctrl+C, SIGTERM = kill signal).
   *
   * This ensures in-flight operations complete and connections are
   * properly released before the process exits.
   */
  process.on("SIGINT", async () => {
    console.log("[DB] SIGINT received. Closing MongoDB connection...");
    await mongoose.connection.close();
    console.log("[DB] MongoDB connection closed. Exiting process.");
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("[DB] SIGTERM received. Closing MongoDB connection...");
    await mongoose.connection.close();
    console.log("[DB] MongoDB connection closed. Exiting process.");
    process.exit(0);
  });
}