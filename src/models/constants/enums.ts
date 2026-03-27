/**
 * @file enums.ts
 * @description Central source of truth for all enum/status constants used
 * across the MongoDB schemas. Every allowed string value for every enum
 * field in the database is defined here — nowhere else.
 *
 * Rules:
 *  - Never hardcode these strings in schema files or application logic.
 *  - Always import from this file.
 *  - To add/remove a value, change it here only.
 *
 * The `as const` assertion does two things:
 *  1. Makes every array deeply readonly — no accidental mutation at runtime.
 *  2. Narrows each element's type from `string` to its literal type
 *     (e.g. "draft" instead of string), which unlocks precise TypeScript
 *     type checking everywhere these values are used.
 */

/* -------------------------------------------------------------------------
 * Raw constant arrays
 * -------------------------------------------------------------------------
 * These are the actual values stored in MongoDB. Keep them lowercase and
 * underscore-separated (snake_case) for consistency.
 * ---------------------------------------------------------------------- */

export const STATUS = {

  /**
   * Lifecycle states of an Event document.
   *
   * draft      → created but not yet visible to the public
   * published  → open for registration
   * closed     → registration window has ended; event may have occurred
   * cancelled  → event will not happen; registrations should be voided
   */
  EVENT: ["draft", "published", "closed", "cancelled"] as const,

  /**
   * Lifecycle states of a Registration document.
   *
   * pending    → submitted by participant; awaiting staff review
   * approved   → reviewed and accepted; ticket is generated at this point
   * rejected   → reviewed and declined; rejection reason should be recorded
   * checked_in → participant physically arrived and was scanned at the event
   */
  REGISTRATION: ["pending", "approved", "rejected", "checked_in"] as const,

  /**
   * Internal user roles (PT. XYZ staff only — participant and exhibitor only exists for record purpose).
   *
   * super_admin → full system access including user management
   * admin       → manages events and registrations; cannot manage users
  
  /**
   * The role a participant plays at a specific event.
   * Stored per-registration, not on the participant profile itself.
   *
   * visitor   → attending the event as a general audience member
   * exhibitor → attending as a brand/company 

   */
  USER_ROLE: ["super_admin", "admin", "participant", "exhibitor"] as const,

  /**
   * Input field types supported in custom registration forms.
   * Determines how the field is rendered on the frontend and how
   * its submitted value is validated.
   *
   * text      → single-line free text
   * email     → email address (validated format)
   * phone     → phone number
   * number    → numeric input
   * textarea  → multi-line free text
   * radio     → single choice from a list (mutually exclusive)
   * checkbox  → multiple choices from a list
   * select    → dropdown single choice
   * date      → date picker
   * file      → file upload
   */
  FIELD_TYPE: [
    "text",
    "email",
    "phone",
    "number",
    "textarea",
    "radio",
    "checkbox",
    "select",
    "date",
    "file",
  ] as const,

  /**
   * Question types supported in post-event surveys.
   * Mostly mirrors FIELD_TYPE but includes survey-specific types
   * like `rating` and excludes form-specific types like `file`.
   *
   * text     → short free-text answer
   * textarea → long free-text answer
   * radio    → single choice
   * checkbox → multiple choices
   * select   → dropdown single choice
   * rating   → numeric scale (e.g. 1–5 stars)
   * number   → numeric input
   * date     → date picker
   */
  SURVEY_QUESTION_TYPE: [
    "text",
    "textarea",
    "radio",
    "checkbox",
    "select",
    "rating",
    "number",
    "date",
  ] as const,

  /**
   * Actions recorded in the audit log.
   * Every meaningful state change in the system should map to one of these.
   *
   * create   → a new document was created
   * update   → an existing document was modified
   * delete   → a document was deleted or deactivated
   * approve  → a registration was approved
   * reject   → a registration was rejected
   * check_in → a participant was checked in at the event
   * export   → data was exported (CSV, Excel, etc.)
   * login    → a user logged into the system
   * publish  → an event or survey was published
   */
  AUDIT_ACTION: [
    "create",
    "update",
    "delete",
    "approve",
    "reject",
    "check_in",
    "export",
    "login",
    "publish",
  ] as const,

  /**
   * Purpose of an OTP code.
   * Stored on OtpSchema to allow future extensibility (e.g. adding "2fa").
   *
   * login → OTP was requested to authenticate a user session
   */
  OTP_PURPOSE: ["login"] as const,

} as const;

/* -------------------------------------------------------------------------
 * Derived TypeScript union types
 * -------------------------------------------------------------------------
 * These types are automatically derived from the constant arrays above.
 *
 * How it works:
 *   typeof STATUS.EVENT         → readonly ["draft", "published", "closed", "cancelled"]
 *   typeof STATUS.EVENT[number] → "draft" | "published" | "closed" | "cancelled"
 *
 * Why this matters:
 *   Instead of manually writing `type EventStatus = "draft" | "published" | ...`
 *   (which would drift out of sync with STATUS.EVENT over time), we derive
 *   the type directly from the array. Change the array → type updates automatically.
 *
 * Usage example:
 *   import { EventStatus } from "@/models/constants/enums";
 *   function updateStatus(status: EventStatus) { ... }
 * ---------------------------------------------------------------------- */

/** "draft" | "published" | "closed" | "cancelled" */
export type EventStatus = typeof STATUS.EVENT[number];

/** "pending" | "approved" | "rejected" | "checked_in" */
export type RegistrationStatus = typeof STATUS.REGISTRATION[number];

/** "super_admin" | "admin" | "participant" | "exhibitor" */
export type UserRole = typeof STATUS.USER_ROLE[number];

/** "text" | "email" | "phone" | "number" | "textarea" | "radio" | "checkbox" | "select" | "date" | "file" */
export type FieldType = typeof STATUS.FIELD_TYPE[number];

/** "text" | "textarea" | "radio" | "checkbox" | "select" | "rating" | "number" | "date" */
export type SurveyQuestionType = typeof STATUS.SURVEY_QUESTION_TYPE[number];

/** "create" | "update" | "delete" | "approve" | "reject" | "check_in" | "export" | "login" | "publish" */
export type AuditAction = typeof STATUS.AUDIT_ACTION[number];

/** "login" */
export type OtpPurpose = typeof STATUS.OTP_PURPOSE[number];