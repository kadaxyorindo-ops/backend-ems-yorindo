/**
 * @file survey.schema.ts
 * @description Schema for post-event surveys.
 *
 * A survey is an optional feedback form attached to an event.
 * It is created and managed by admin/staff, and filled in by participants
 * after the event concludes.
 *
 * Relationship to events:
 *   - One event → at most one survey (1:1 relationship).
 *   - The unique index on `eventId` enforces this at the database level.
 *   - The Event document has a `surveyId` field pointing back here for
 *     convenience lookups from the event side.
 *
 * Survey lifecycle:
 *   - Created as a draft (isPublished: false) — questions can be edited freely.
 *   - Published (isPublished: true) — visible to participants; questions
 *     should be treated as locked to preserve response integrity.
 *   - `publishedAt` records when it was first published.
 *
 * Fix from schema review:
 *   The original draft had BOTH `unique: true` on the eventId field definition
 *   AND a separate `SurveySchema.index({ eventId: 1 }, { unique: true })` call.
 *   This created a duplicate index in MongoDB. Fixed by using only the
 *   explicit index call — the inline unique flag is removed.
 */

import { Schema, model, Types } from "mongoose";
import { SurveyQuestionSchema } from "./sub/survey-question.schema.js";
import type { ISurveyQuestion } from "./sub/survey-question.schema.js";
import { safeTrim } from "../helpers/transformers.js";

export interface ISurvey {
  /**
   * Reference to the event this survey belongs to.
   * Unique — one event can have at most one survey.
   */
  eventId: Types.ObjectId;

  /** Display title of the survey shown to participants. */
  title: string;

  /** Ordered list of questions in this survey. */
  questions: ISurveyQuestion[];

  /**
   * Whether this survey is currently published and visible to participants.
   * While false, the survey is a draft and should not be accessible
   * via public-facing endpoints.
   */
  isPublished: boolean;

  /**
   * Timestamp when this survey was first published.
   * Null if the survey has never been published.
   */
  publishedAt: Date | null;

  /** The staff member who created this survey. */
  createdBy: Types.ObjectId;
}

const SurveySchema = new Schema<ISurvey>(
  {
    // Note: unique constraint is enforced via the index below, NOT inline.
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      set: safeTrim,
    },
    questions: {
      type: [SurveyQuestionSchema],
      required: true,
      default: [],
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "surveys",
  }
);

// --- Indexes ---

// One survey per event — unique constraint enforced here only (not inline on the field).
// This is the fix from the schema review: the original had a duplicate unique index.
SurveySchema.index({ eventId: 1 }, { unique: true });

export const Survey = model<ISurvey>("Survey", SurveySchema);