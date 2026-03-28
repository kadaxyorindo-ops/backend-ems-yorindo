/**
 * @file form-snapshot-field.schema.ts
 * @description Reusable sub-schema representing a frozen copy of a single
 * form field, captured at the exact moment a participant submits their
 * registration.
 *
 * Used in:
 *  - RegistrationSchema → formSnapshot.fields[]
 *
 * Why this exists (the snapshot pattern):
 *   Event organizers can edit a registration form at any time — adding,
 *   removing, or relabeling fields. Without a snapshot, it would be
 *   impossible to know what form a participant actually saw and filled in.
 *
 *   When a registration is submitted, the current version of each field in
 *   the event's registrationForm.fields[] is copied here as-is. This record
 *   is then immutable — it is never updated after creation.
 *
 * What is intentionally excluded vs RegistrationFieldSchema:
 *   - `placeholder`, `helpText`  → UI hints; irrelevant after submission
 *   - `validation`               → enforcement already happened at submit time
 *   - `visibility`               → conditional logic; irrelevant after submission
 *   - `isActive`                 → field state at snapshot time is implicit
 *
 * What is intentionally kept:
 *   - `fieldId`, `key`           → needed to match answers to their fields
 *   - `label`, `type`, `order`   → needed to render historical submissions correctly
 *   - `isFixed`                  → informational; preserved for audit clarity
 *   - `options`                  → needed to decode stored option values into labels
 *
 * `_id: false` — embedded sub-document, no ObjectId needed.
 */

import { Schema } from "mongoose";
import type { FieldType } from "../../constants/enums.js";
import { OptionSchema } from "./option.schema.js";
import type { IOption } from "./option.schema.js";

export interface IFormSnapshotField {
  /** Matches the `fieldId` on the source RegistrationField. */
  fieldId: string;

  /** Matches the `key` on the source RegistrationField. */
  key: string;

  /** The label as it appeared to the participant at submission time. */
  label: string;

  /** The field type at submission time. */
  type: FieldType;

  /** The display order at submission time. */
  order: number;

  /** Whether this was a fixed (system-required) field at submission time. */
  isFixed: boolean;

  /**
   * The available options at submission time.
   * Preserved so that stored option values can be decoded into labels
   * when rendering historical registrations.
   */
  options?: IOption[];
}

export const FormSnapshotFieldSchema = new Schema<IFormSnapshotField>(
  {
    fieldId: { type: String, required: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, required: true },
    order: { type: Number, required: true },
    isFixed: { type: Boolean, default: false },
    options: { type: [OptionSchema], default: undefined },
  },
  { _id: false }
);