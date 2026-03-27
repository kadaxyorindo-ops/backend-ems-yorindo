/**
 * @file option.schema.ts
 * @description Reusable sub-schema for a single selectable option in fields
 * that present a list of choices: radio, checkbox, and select field types.
 *
 * Used in:
 *  - RegistrationFieldSchema (options for form fields)
 *  - FormSnapshotFieldSchema (frozen copy of options at submission time)
 *  - SurveyQuestionSchema    (options for survey questions)
 *
 * `_id: false` — sub-schemas embedded inside arrays do not need their own
 * MongoDB ObjectId. Omitting it reduces document size and avoids confusion
 * when iterating over options on the frontend.
 */

import { Schema } from "mongoose";

export interface IOption {
  value: string; // Actual stored value submitted when this option is selected
  label: string; // The human-readable text displayed to the participant in the UI
  isDefault: boolean;
  /**
   * Whether this option should be pre-selected when the form renders.
   * Only one option per field should have isDefault: true for radio/select.
   * Multiple defaults are allowed for checkbox fields.
   */
}

export const OptionSchema = new Schema<IOption>(
  {
    value: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);
