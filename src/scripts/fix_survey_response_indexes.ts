/**
 * Fix legacy MongoDB indexes on `survey_responses`.
 *
 * Problem:
 *   Some environments still have a legacy UNIQUE index:
 *     { surveyId: 1, participantId: 1 }
 *   When `surveyId` is null, that index prevents a participant from having
 *   more than one response (across all events), causing E11000 dup key errors.
 *
 * This script:
 *   - Drops `surveyId_1_participantId_1` if it exists
 *   - Syncs indexes to match the current schema
 *
 * Usage (PowerShell):
 *   node --loader ts-node/esm src/scripts/fix_survey_response_indexes.ts
 */

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { SurveyResponse } from "../models/schemas/survey-response.schema.js";

async function main(): Promise<void> {
  await connectDB();

  const indexes = await SurveyResponse.collection.indexes();
  const legacy = indexes.find((idx) => idx.name === "surveyId_1_participantId_1");

  if (legacy) {
    console.log("[FIX] Dropping legacy index: surveyId_1_participantId_1");
    await SurveyResponse.collection.dropIndex("surveyId_1_participantId_1");
  } else {
    console.log("[FIX] Legacy index not found: surveyId_1_participantId_1");
  }

  console.log("[FIX] Syncing indexes for survey_responses...");
  await SurveyResponse.syncIndexes();

  console.log("[FIX] Done.");
  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error("[FIX] Failed:", err);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore
  }
  process.exit(1);
});

