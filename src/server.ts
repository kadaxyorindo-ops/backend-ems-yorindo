/**
 * @file testConnection.ts
 * @description Standalone script to verify that the local MongoDB connection
 * is working correctly. Run this independently of the main server.
 *
 * This script intentionally does NOT import any models — it only tests
 * the raw connection so you can isolate connection issues from schema issues.
 *
 * Pre-requisites:
 *   1. MongoDB is running locally (sudo systemctl start mongod)
 *   2. MONGODB_URI is set in your .env file
 *      e.g. MONGODB_URI=mongodb://127.0.0.1:27017/xyz_ems
 *
 * Usage:
 *   npx tsx src/testConnection.ts
 *
 * Expected output on success:
 *   [TEST] Starting MongoDB connection test...
 *   [DB] Connected to MongoDB successfully. Host: 127.0.0.1 | Database: xyz_ems
 *   [TEST] Ping successful — MongoDB is reachable.
 *   [TEST] Connection test passed. Closing connection...
 *   [TEST] Done.
 *
 * Delete or move this file out of src/ once the connection is confirmed.
 */

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";

async function testConnection(): Promise<void> {
  console.log("[TEST] Starting MongoDB connection test...\n");

  // Step 1: Establish the connection using the same utility the app uses.
  await connectDB();

  // Step 2: Send a lightweight ping command to confirm the server is responsive.
  // db.admin().ping() sends { ping: 1 } to MongoDB — the fastest possible check.
  try {
    await mongoose.connection.db?.admin().command({ ping: 1 });
    console.log("[TEST] Ping successful — MongoDB is reachable.");
  } catch (error) {
    console.error("[TEST] Ping failed:", error);
    process.exit(1);
  }

  // Step 3: Close the connection cleanly.
  console.log("\n[TEST] Connection test passed. Closing connection...");
  await mongoose.connection.close();
  console.log("[TEST] Done.");
  process.exit(0);
}

testConnection();