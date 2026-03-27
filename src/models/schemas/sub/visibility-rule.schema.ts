/**
 * @file visibility-rule.schema.ts
 * @description Reusable sub-schema that defines conditional visibility rules
 * for a registration form field.
 *
 * Used in:
 *  - RegistrationFieldSchema (array of VisibilityRules per field)
 *
 * A field is visible when ALL rules in its visibility array evaluate to true.
 * If the visibility array is empty or undefined, the field is always visible.
 *
 * This schema supports two kinds of conditions:
 *
 * 1. Static conditions — based on fixed context values:
 *    - participantTypes: show only to "visitor" or "exhibitor"
 *    - eventCategories:  show only for specific event categories
 *
 * 2. Dynamic conditions — based on another field's current value:
 *    - dependsOnFieldId: the fieldId of the field being watched
 *    - operator:         how to compare the watched field's value
 *    - value:            the value to compare against
 *
 * Example — show "Booth Size" only when participantType is "exhibitor":
 *   {
 *     participantTypes: ["exhibitor"]
 *   }
 *
 * Example — show "Other Source" only when "How did you hear about us?" equals "Other":
 *   {
 *     dependsOnFieldId: "source_channel",
 *     operator: "equals",
 *     value: "other"
 *   }
 *
 * `_id: false` — embedded sub-document, no ObjectId needed.
 */

import { Schema } from "mongoose";
import { STATUS } from "../../constants/enums.js";
import type { UserRole } from "../../constants/enums.js";

export type VisibilityOperator =
  | "equals"
  | "not_equals"
  | "in"
  | "not_in"
  | "exists";

export interface IVisibilityRule {
  /**
   * Restrict visibility to specific participant types.
   * Undefined means the rule applies to all participant types.
   */
  UserRole?: UserRole[];

  /**
   * Restrict visibility to specific event categories.
   * Undefined means the rule applies to all event categories.
   */
  eventCategories?: string[];

  /**
   * The `fieldId` of the sibling field whose value this rule watches.
   * Required when using dynamic (field-dependent) visibility.
   */
  dependsOnFieldId?: string;

  /**
   * The comparison operator applied between the watched field's value
   * and the `value` property below.
   */
  operator?: VisibilityOperator;

  /**
   * The value to compare against.
   * Can be a string, number, boolean, or array depending on the operator.
   */
  value?: unknown;
}

export const VisibilityRuleSchema = new Schema<IVisibilityRule>(
  {
    UserRole: {
      type: [String],
      enum: STATUS.USER_ROLE,
      default: undefined,
    },
    eventCategories: {
      type: [String],
      default: undefined,
    },
    dependsOnFieldId: { type: String, trim: true },
    operator: {
      type: String,
      enum: ["equals", "not_equals", "in", "not_in", "exists"] as const,
    },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false }
);