/**
 * @file survey-answer.schema.ts
 * @description Reusable sub-schema representing a participant's answer to a
 * single question in a post-event survey.
 *
 * Used in:
 *  - SurveyResponseSchema → answers[]
 *
 * Same self-describing rationale as RegistrationAnswerSchema:
 *   Each answer carries its own `questionId`, `label`, and `type` so that
 *   it can be read and interpreted independently — without needing to
 *   look up the parent Survey document to understand the context.
 *
 * Value types by question type:
 *   text / textarea / date → string
 *   number / rating        → number
 *   radio / select         → string  (the selected option value)
 *   checkbox               → string[] (array of selected option values)
 *
 * `_id: false` — embedded sub-document, no ObjectId needed.
 */

import { Schema } from "mongoose";
import { STATUS } from "../../constants/enums.js";
import type { SurveyQuestionType } from "../../constants/enums.js";

export interface ISurveyAnswer {
  /** Matches the `questionId` on the corresponding SurveyQuestion. */
  questionId: string;

  /** The question label at submission time (copied for self-describing readability). */
  label: string;

  /** The question type at submission time (determines how to interpret `value`). */
  type: SurveyQuestionType;

  /**
   * The participant's submitted answer.
   * Type varies by question type — see file-level JSDoc for the mapping.
   */
  value: unknown;
}

export const SurveyAnswerSchema = new Schema<ISurveyAnswer>(
  {
    questionId: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: STATUS.SURVEY_QUESTION_TYPE },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);