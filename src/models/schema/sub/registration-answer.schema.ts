/**
 * @file registration-answer.schema.ts
 * @description Reusable sub-schema representing a participant's answer to a
 * single field in a registration form.
 *
 * Used in:
 *  - RegistrationSchema → answers[]
 *
 * Design rationale — why answers are self-describing:
 *   Each answer carries its own `fieldId`, `key`, `label`, and `type`
 *   (duplicated from the form snapshot). This is intentional — it makes
 *   each answer independently readable without needing to JOIN against the
 *   formSnapshot to understand what question was being answered.
 *
 *   This is especially valuable for:
 *    - Analytics exports (each row is self-contained)
 *    - Audit logs (answers are human-readable without extra lookups)
 *    - Long-term archival (data remains interpretable even if the event
 *      or form structure is later deleted)
 *
 * Value types by field type:
 *   text / email / phone / textarea / date → string
 *   number                                 → number
 *   radio / select                         → string  (the selected option value)
 *   checkbox                               → string[] (array of selected option values)
 *   file                                   → string  (file URL or storage key)
 *
 * `_id: false` — embedded sub-document, no ObjectId needed.
 */

import { Schema } from "mongoose";
import { STATUS } from "../../constants/enums.js";
import type { FieldType } from "../../constants/enums.js";

export interface IRegistrationAnswer {
  /** Matches the `fieldId` on the corresponding FormSnapshotField. */
  fieldId: string;

  /** Matches the `key` on the corresponding FormSnapshotField. */
  key: string;

  /** The field label at submission time (copied for self-describing readability). */
  label: string;

  /** The field type at submission time (determines how to interpret `value`). */
  type: FieldType;

  /**
   * The participant's submitted answer.
   * Type varies by field type — see file-level JSDoc for the mapping.
   * Mixed type is required here because Mongoose schemas cannot express
   * a conditional type based on another field's value.
   */
  value: unknown;
}

export const RegistrationAnswerSchema = new Schema<IRegistrationAnswer>(
  {
    fieldId: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: STATUS.FIELD_TYPE },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);