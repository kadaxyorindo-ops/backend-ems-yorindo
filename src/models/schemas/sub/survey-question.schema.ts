/**
 * @file survey-question.schema.ts
 * @description Reusable sub-schema representing a single question in a
 * post-event survey.
 *
 * Used in:
 *  - SurveySchema → questions[]
 *
 * Relationship to RegistrationFieldSchema:
 *   Survey questions are structurally similar to registration form fields
 *   but serve a different purpose — they collect feedback after the event
 *   rather than information before it. Key differences:
 *    - No `key` field (survey answers are not mapped to participant profiles)
 *    - No `isFixed` (all survey questions are organizer-defined)
 *    - No `visibility` rules (survey questions are always shown)
 *    - No `validation` rules beyond `required` (surveys are low-friction)
 *    - Supports `rating` type (not needed in registration forms)
 *    - No `file` type (file uploads are not appropriate in surveys)
 *
 * `questionId` is an application-generated stable string ID (e.g. UUID).
 * It links questions to their answers in SurveyResponseSchema without
 * relying on array position (which can change if questions are reordered).
 *
 * `_id: false` — embedded sub-document, no ObjectId needed.
 */

import { Schema } from "mongoose";
import { STATUS } from "../../constants/enums.js";
import type { SurveyQuestionType } from "../../constants/enums.js";
import { OptionSchema } from "./option.schema.js";
import type { IOption } from "./option.schema.js";

export interface ISurveyQuestion {
  /**
   * Stable unique identifier for this question (application-generated, e.g. UUID).
   * Used to link survey questions to answers in SurveyResponseSchema.
   */
  questionId: string;

  /** The question text displayed to the participant. */
  label: string;

  /** Input type — determines rendering and how the answer value is interpreted. */
  type: SurveyQuestionType;

  /**
   * Display order of this question within the survey (1-based).
   * Lower numbers appear first.
   */
  order: number;

  /** Whether the participant must answer this question to submit the survey. */
  required: boolean;

  /**
   * Available choices for radio, checkbox, select, and rating questions.
   * For rating: options define the scale labels (e.g. "1" → "Poor", "5" → "Excellent").
   * Undefined or empty for text, textarea, number, and date questions.
   */
  options?: IOption[];
}

export const SurveyQuestionSchema = new Schema<ISurveyQuestion>(
  {
    questionId: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: STATUS.SURVEY_QUESTION_TYPE },
    order: { type: Number, required: true, min: 1 },
    required: { type: Boolean, default: false },
    options: { type: [OptionSchema], default: undefined },
  },
  { _id: false }
);