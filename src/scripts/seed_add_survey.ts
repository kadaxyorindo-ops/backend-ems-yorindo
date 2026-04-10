/**
 * @file seed_add_survey.ts
 * @description Append-only seeder for `event_feedbacks`.
 *
 * Uses random eventId + participantId (or random ObjectIds if the collections
 * are empty), because there is no backend route yet to submit feedback.
 *
 * Usage:
 *   npx tsx src/scripts/seed_add_survey.ts
 */

import "dotenv/config";
import mongoose, { Types } from "mongoose";
import { connectDB } from "../config/db.js";
import { Event } from "../models/schemas/event.schema.js";
import { Participant } from "../models/schemas/participant.schema.js";
import { EventFeedback } from "../models/schemas/event-feedback.schema.js";

const DEFAULT_COUNT = 50;

function clampRating(value: number): number {
  return Math.min(5, Math.max(1, value));
}

function weightedRating(): number {
  // Bias toward 3-5.
  const r = Math.random();
  if (r < 0.05) return 1;
  if (r < 0.15) return 2;
  if (r < 0.42) return 3;
  if (r < 0.78) return 4;
  return 5;
}

function jitterFrom(base: number): number {
  const r = Math.random();
  const delta = r < 0.15 ? -1 : r < 0.8 ? 0 : 1;
  return clampRating(base + delta);
}

function randBetween(start: Date, end: Date): Date {
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(t);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function maybeComment(overall: number): string | undefined {
  // Mix: missing, empty, or realistic short feedback.
  const r = Math.random();
  if (r < 0.25) return undefined;
  if (r < 0.35) return "";

  const positive = [
    "Great speakers and practical takeaways.",
    "Well organized and easy to follow.",
    "Really enjoyed the session—very insightful.",
    "Nice pacing and good interaction with the audience.",
    "Content was clear and relevant to my work.",
    "Smooth logistics and helpful committee.",
  ];

  const neutral = [
    "Overall good, but some parts felt a bit rushed.",
    "Decent session—would love a bit more depth next time.",
    "Good topics, just a little repetitive in the middle.",
    "Nice event, but the slides were a bit too text-heavy.",
    "Met expectations, though Q&A time could be longer.",
  ];

  const constructive = [
    "Audio/visual could be improved for better clarity.",
    "Please start on time and keep transitions smoother.",
    "Would appreciate more real case studies and demos.",
    "The agenda changed a lot—clearer flow would help.",
    "Seating/room layout could be more comfortable.",
  ];

  if (overall >= 4) return pick(positive);
  if (overall === 3) return pick([...neutral, ...constructive]);
  return pick(constructive);
}

async function seed(): Promise<void> {
  await connectDB();
  console.log("\n[SEED] Seeding event feedbacks...\n");

  const seedCount = Number(process.env.SEED_EVENT_FEEDBACK_COUNT ?? DEFAULT_COUNT);
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [eventIds, participantIds] = await Promise.all([
    Event.find({}, { _id: 1 }).lean(),
    Participant.find({}, { _id: 1 }).lean(),
  ]);

  const resolvedEventIds: Types.ObjectId[] =
    eventIds.length > 0
      ? eventIds.map((e) => e._id as Types.ObjectId)
      : Array.from({ length: 10 }, () => new Types.ObjectId());

  const resolvedParticipantIds: Types.ObjectId[] =
    participantIds.length > 0
      ? participantIds.map((p) => p._id as Types.ObjectId)
      : Array.from({ length: 50 }, () => new Types.ObjectId());

  const docs: Array<Record<string, unknown>> = [];
  const usedPairs = new Set<string>();

  let attempts = 0;
  const maxAttempts = seedCount * 50;

  while (docs.length < seedCount && attempts < maxAttempts) {
    attempts += 1;

    const eventId = pick(resolvedEventIds);
    const participantId = pick(resolvedParticipantIds);
    const pairKey = `${eventId.toHexString()}_${participantId.toHexString()}`;
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);

    const overall = weightedRating();
    const expectationMatch = jitterFrom(overall);
    const contentQuality = jitterFrom(overall);
    const speaker = jitterFrom(overall);
    const eventFlow = jitterFrom(overall);
    const logistics = jitterFrom(overall);

    const joinChance =
      overall >= 4 ? 0.9 : overall === 3 ? 0.6 : overall === 2 ? 0.25 : 0.1;

    const createdAt = randBetween(threeMonthsAgo, now);
    const comment = maybeComment(overall);

    const doc: Record<string, unknown> = {
      eventId,
      participantId,
      overallExperience: overall,
      expectationMatch,
      contentQuality,
      speaker,
      eventFlow,
      logistics,
      willJoinAgain: Math.random() < joinChance,
      createdAt,
      updatedAt: createdAt,
    };

    if (comment !== undefined) {
      doc.comment = comment;
    }

    docs.push(doc);
  }

  if (docs.length < seedCount) {
    console.warn(
      `[SEED] Only generated ${docs.length}/${seedCount} unique feedback docs (not enough unique id pairs).`
    );
  }

  const inserted = await EventFeedback.insertMany(docs, { ordered: false });
  console.log(`[SEED] Inserted event feedbacks: ${inserted.length}`);

  console.log("\n[SEED] Complete.\n");
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[SEED] Fatal error:", err);
  process.exit(1);
});
