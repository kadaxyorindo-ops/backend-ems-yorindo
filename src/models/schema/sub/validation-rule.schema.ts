
/**
 * @file validation-rule.schema.ts
 * @description Reusable sub-schema that defines the validation constraints
 * for a single registration form field.
 *
 * Used in:
 *  - RegistrationFieldSchema (one ValidationRule per field)
 *
 * These rules are enforced by the frontend at form submission time, and
 * should also be re-validated on the backend before saving the registration.
 *
 * All fields are optional — a field with no validation rules set is
 * considered unconstrained (aside from its base type).
 *
 * `_id: false` — embedded sub-document, no ObjectId needed.
 */
 
import { Schema } from "mongoose";

export interface IValidationRule {
    required: boolean; // Whether the participant must fill in this field to submit the form.
    minLength?: number; // Minimum number of characters allowed (applies to text/textarea/email/phone).
    maxLength?: number; // Maximum number of characters allowed (applies to text/textarea/email/phone).
    minValue?: number; // Minimum numeric value allowed (applies to number fields).
    maxValue?: number; // Maximum numeric value allowed (applies to number fields).
    regex?: string;
    /**
   * A regular expression pattern the value must match.
   * Stored as a string (e.g. "^[A-Z]{3}$") and compiled at validation time.
   * Use sparingly — prefer dedicated field types (email, phone) over regex.
   */
}

export const ValidationRuleSchema = new Schema<IValidationRule>(
  {
    required: { type: Boolean, default: false },
    minLength: { type: Number },
    maxLength: { type: Number },
    minValue: { type: Number },
    maxValue: { type: Number },
    regex: { type: String },
  },
  { _id: false }
);