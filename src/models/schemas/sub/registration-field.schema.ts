/**
 * @file registration-field.schema.ts
 * @description Reusable sub-schema representing a single field definition
 * inside a custom registration form. This is the form *template* — it
 * describes what the field looks like, not a participant's answer to it.
 *
 * Used in:
 *  - EventSchema → registrationForm.fields[]
 *
 * Each field in a registration form is described by this schema.
 * When a participant submits their registration, a snapshot of this field
 * (FormSnapshotFieldSchema) is frozen into the Registration document.
 *
 * Field identity:
 *  - `fieldId` is a stable, application-generated string ID (e.g. UUID or
 *    a short slug). It is used to cross-reference fields between the live
 *    form, the snapshot, and the submitted answers. Do NOT use MongoDB's
 *    auto-generated `_id` for this — we disable `_id` on sub-schemas.
 *  - `key` is a human-readable programmatic identifier (e.g. "company_email",
 *    "full_name"). Used as the key in answer maps and analytics exports.
 *
 * `isFixed: true` marks system-required fields (e.g. full name, email) that
 * cannot be removed or reordered by the event organizer.
 *
 * `_id: false` — embedded sub-document, no ObjectId needed.
 */

import { Schema } from "mongoose";
import { STATUS } from "../../constants/enums.js";
import type { FieldType } from "../../constants/enums.js";
import { OptionSchema } from "./option.schema.js";
import type { IOption } from "./option.schema.js";
import { ValidationRuleSchema } from "./validation-rule.schema.js";
import type { IValidationRule } from "./validation-rule.schema.js";
import { VisibilityRuleSchema } from "./visibility-rule.schema.js";
import type { IVisibilityRule } from "./visibility-rule.schema.js";

export interface IRegistrationField {
  /**
   * Stable unique identifier for this field (application-generated, e.g. UUID).
   * Used to link form fields → snapshot fields → submitted answers.
   */
  fieldId: string;

  /**
   * Programmatic key for this field (e.g. "full_name", "company_email").
   * Must be unique within a form. Used in exports and answer mapping.
   */
  key: string;

  /** Human-readable label shown to the participant above the input. */
  label: string;

  /** Input type — determines rendering and validation behavior. */
  type: FieldType;

  /**
   * Display order of this field within the form (1-based).
   * Lower numbers appear first. Must be unique within a form.
   */
  order: number;

  /**
   * Whether this is a system-required field that cannot be removed or
   * reordered by the event organizer (e.g. "Full Name", "Email").
   */
  isFixed: boolean;

  /** Placeholder text shown inside the input when it is empty. */
  placeholder?: string;

  /** Helper text shown below the input to guide the participant. */
  helpText?: string;

  /**
   * Available choices for radio, checkbox, and select fields.
   * Undefined or empty for all other field types.
   */
  options?: IOption[];

  /** Validation constraints applied to this field's submitted value. */
  validation: IValidationRule;

  /**
   * Conditional visibility rules. The field is shown only when all
   * rules evaluate to true. Empty array = always visible.
   */
  visibility?: IVisibilityRule[];

  /**
   * Whether this field is currently active on the form.
   * Inactive fields are hidden from participants but preserved for
   * historical snapshot accuracy on existing registrations.
   */
  isActive: boolean;
}

export const RegistrationFieldSchema = new Schema<IRegistrationField>(
  {
    fieldId: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: STATUS.FIELD_TYPE },
    order: { type: Number, required: true, min: 1 },
    isFixed: { type: Boolean, default: false },
    placeholder: { type: String, trim: true },
    helpText: { type: String, trim: true },
    options: { type: [OptionSchema], default: undefined },
    validation: { type: ValidationRuleSchema, default: () => ({}) },
    visibility: { type: [VisibilityRuleSchema], default: undefined },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);