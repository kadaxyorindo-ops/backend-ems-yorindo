/**
 * @file survey-response.schema.ts
 * @description Schema for a participant's response to a post-event survey.
 *
 * A survey response is created when a participant submits their answers
 * to a survey after attending an event.
 *
 * Constraints:
 *   - One response per participant per survey (enforced by unique index).
 *   - A response can only be submitted for a published survey.
 *   - Application layer should verify the participant has a checked_in
 *     registration for the event before accepting a survey response.
 *
 * Why both `eventId` and `surveyId` are stored:
 *   - `surveyId` is the primary reference — it identifies which survey
 *     was answered and links to the question definitions.
 *   - `eventId` is stored for denormalization — it allows efficient queries
 *     like "all survey responses for event X" without joining through surveys.
 *     This is especially useful for analytics dashboards.
 *
 * `submittedAt` vs `createdAt`:
 *   Both are present — `createdAt` is set by Mongoose timestamps
 *   automatically. `submittedAt` is an explicit field defaulting to
 *   Date.now() for semantic clarity in analytics queries and exports.
 *   They should have the same value in practice.
 */

import { Schema, model, Types } from "mongoose";
import { SurveyAnswerSchema } from "./sub/survey-answer.schema.js";
import type { ISurveyAnswer } from "./sub/survey-answer.schema.js";

export interface ISurveyResponse {
  /** Reference to the event this response is for (denormalized for query efficiency). */
  eventId: Types.ObjectId;

  /** Reference to the survey that was answered (optional for registration custom answers). */
  surveyId: Types.ObjectId | null;

  /** Reference to the participant who submitted this response. */
  participantId: Types.ObjectId;

  /**
   * The participant's answers, one per survey question.
   * Self-describing — each answer carries its own question metadata.
   */
  answers: ISurveyAnswer[];

  /**
   * Timestamp when the participant submitted this response.
   * Defaults to the current time at document creation.
   */
  submittedAt: Date;
}

const SurveyResponseSchema = new Schema<ISurveyResponse>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    surveyId: {
      type: Schema.Types.ObjectId,
      ref: "Survey",
      default: null,
    },
    participantId: {
      type: Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
    },
    answers: {
      type: [SurveyAnswerSchema],
      required: true,
      default: [],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "survey_responses",
  }
);

// --- Indexes ---

// One response per participant per event.
SurveyResponseSchema.index({ eventId: 1, participantId: 1 }, { unique: true });

// Analytics query — "all responses for event X, sorted by submission time".
SurveyResponseSchema.index({ eventId: 1, submittedAt: -1 });

// Participant history — "all surveys this participant has responded to".
SurveyResponseSchema.index({ participantId: 1 });

export const SurveyResponse = model<ISurveyResponse>("SurveyResponse", SurveyResponseSchema);
