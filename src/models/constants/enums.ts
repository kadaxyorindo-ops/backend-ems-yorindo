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
   * draft        → created but not yet visible to the public, participant can't register yet
   * upcoming     → Event is published, participant can't register yet
   * registration → Event is published, participant can register
   * ongoing      → Event is ongoing, participant can still register on the spot 
   * done         → Event is finished, can't register
   * cancelled    → event will not happen; registrations should be voided
   * 
   */
  EVENT: ["draft", "upcoming", "registration", "ongoing", "done", "cancelled"] as const,

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
   * All role values that can be stored on a user or registration document.
   *
   * System roles (dashboard staff):
   *   super_admin             → full access, manages users and all features
   *   event_operator          → manages events and registrations
   *   communication_operator  → manages email blasts and participant communication
   *   survey_analyst          → manages surveys and analytics (future module)
   *
   * Registration record-keeping roles (never authenticate into the dashboard):
   *   participant  → registered as a general visitor for an event
   *   exhibitor    → registered as a brand/company representative
   */
  USER_ROLE: [
    "super_admin",
    "event_operator",
    "communication_operator",
    "survey_analyst",
    "participant",
    "exhibitor",
  ] as const,

  /**
   * Roles allowed to authenticate into the internal EMS dashboard.
   * Kept separate from USER_ROLE because participant/exhibitor are valid
   * record-keeping values in other collections, but must never log into
   * the staff dashboard.
   *
   * super_admin            → full access, user management
   * event_operator         → event and registration management
   * communication_operator → communication and email blast
   * survey_analyst         → survey and analytics (future — role exists, module not yet built)
   */
  SYSTEM_ROLE: [
    "super_admin",
    "event_operator",
    "communication_operator",
    "survey_analyst",
  ] as const,

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
   * Feature-level permissions that can be assigned to non-super_admin users.
   *
   * Grouped by stakeholder responsibility area:
   *
   * Event Operations — manages events, registration, ticketing, and check-in
   *   events:view         → access the event list and details
   *   events:create       → create new events
   *   events:edit         → edit existing events
   *   events:delete       → cancel / soft-delete events
   *   registrations:view     → view registration submissions for events
   *   registrations:approve  → approve or reject registrations
   *   registrations:checkin  → scan / check in participants at the event
   *
   * Communication — manages email blasts and participant messaging
   *   communication:view  → access the communication page
   *   communication:send  → send emails / broadcasts to participants
   *
   * Survey & Analytics — manages post-event surveys and data analysis
   *   (future module — defined here for forward-compatibility, not yet in UI)
   *   surveys:view        → view survey definitions and responses
   *   surveys:manage      → create and publish surveys
   *   analytics:view      → access analytics dashboards and reports
   *
   * Rules:
   *  - super_admin always bypasses permission checks — do NOT add them to this enum.
   *  - users:* is NOT in this enum — user management is super_admin-only, hardcoded in middleware.
   *  - Survey & Analytics codes are defined here but excluded from the active
   *    permission-assignment UI until the module is implemented.
   */
  PERMISSION: [
    // Event Operations
    "events:view",
    "events:create",
    "events:edit",
    "events:delete",
    "registrations:view",
    "registrations:approve",
    "registrations:checkin",
    // Communication
    "communication:view",
    "communication:send",
    // Survey & Analytics (future — enum is ready, UI assignment not yet exposed)
    "surveys:view",
    "surveys:manage",
    "analytics:view",
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

/** "super_admin" | "event_operator" | "communication_operator" | "survey_analyst" | "participant" | "exhibitor" */
export type UserRole = typeof STATUS.USER_ROLE[number];

/** "super_admin" | "event_operator" | "communication_operator" | "survey_analyst" */
export type SystemRole = typeof STATUS.SYSTEM_ROLE[number];

/** "text" | "email" | "phone" | "number" | "textarea" | "radio" | "checkbox" | "select" | "date" | "file" */
export type FieldType = typeof STATUS.FIELD_TYPE[number];

/** "text" | "textarea" | "radio" | "checkbox" | "select" | "rating" | "number" | "date" */
export type SurveyQuestionType = typeof STATUS.SURVEY_QUESTION_TYPE[number];

/** "create" | "update" | "delete" | "approve" | "reject" | "check_in" | "export" | "login" | "publish" */
export type AuditAction = typeof STATUS.AUDIT_ACTION[number];

/** "login" */
export type OtpPurpose = typeof STATUS.OTP_PURPOSE[number];

/**
 * "events:view" | "events:create" | "events:edit" | "events:delete" |
 * "registrations:view" | "registrations:approve" | "registrations:checkin" |
 * "communication:view" | "communication:send" |
 * "surveys:view" | "surveys:manage" | "analytics:view"
 */
export type Permission = typeof STATUS.PERMISSION[number];
