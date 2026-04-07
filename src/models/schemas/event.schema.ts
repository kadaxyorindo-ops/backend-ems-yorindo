/**
 * @file event.schema.ts
 * @description Schema for events managed by PT. XYZ.
 *
 * An event is the top-level entity in the system — everything else
 * (registrations, surveys, audit logs) references an event.
 *
 * Event lifecycle (status field):
 *   draft        → created by admin; form can be edited; not visible to public
 *   upcoming     → Event is published, participant can't register yet
 *   registration → Event is published, participant can register
 *   ongoing      → Event is ongoing, participant can still register on the spot
 *   done         → Event is finished, can't register
 *   cancelled    → event will not happen; all registrations should be voided
 *
 * Industry coupling:
 *   Each event belongs to exactly one industry (e.g. Healthcare, Technology).
 *   Stored as a MasterSnapshot (refId + name) so the display name is preserved
 *   even if the master Industry record is later renamed.
 *
 * Registration form:
 *   The form definition lives inside the event document as an embedded
 *   sub-document (registrationForm). This keeps the form and event tightly
 *   coupled and avoids an extra collection for a 1:1 relationship.
 *
 *   `registrationForm.version` is incremented each time the form is
 *   published. When a participant submits a registration, the current
 *   version is frozen into the Registration's formSnapshot — allowing
 *   historical registrations to reference the exact form version they used.
 *
 *   `registrationForm.publishedAt` records when the form was last published.
 *   Before this timestamp, the form is considered a draft and editable.
 *   After publishing, form edits should increment the version.
 *
 * Survey relationship:
 *   An event can optionally have one post-event survey (surveyId).
 *   The Survey document references back to the event via its own eventId.
 *   The surveyId here exists for convenience lookups from the event side.
 *
 * Note on maxCapacity:
 *   Removed. The client confirmed they do not enforce a hard capacity limit —
 *   participant count is controlled purely through the approval workflow.
 */

import { Schema, model, Types } from "mongoose";
import { STATUS } from "../constants/enums.js";
import type { EventStatus } from "../constants/enums.js";
import { lowerTrim, safeTrim } from "../helpers/transformers.js";
import { RegistrationFieldSchema } from "./sub/registration-field.schema.js";
import type { IRegistrationField } from "./sub/registration-field.schema.js";
import { MasterSnapshotSchema } from "./sub/master-snapshot.schema.js";
import type { IMasterSnapshot } from "./sub/master-snapshot.schema.js";

export interface IEvent {
  /** Event title displayed in the UI and communications (e.g. "Tech Expo 2025"). */
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  title: string;

  /**
   * URL-friendly identifier generated from the title.
   * Format: "tech-expo-2025-a3f2" (slug + 4-char random hex suffix for uniqueness).
   * Used for human-readable URLs and event lookups.
   */
  slug: string;

  /** Optional long-form description of the event. */
  description: string | null;

  /**
   * Event category for filtering and analytics (e.g. "Workshop", "Exhibition").
   * Free-text — not a master data reference.
   */
  category: string | null;

  /**
   * The industry this event belongs to.
   * Stored as a MasterSnapshot (refId + name) so the display name is preserved
   * even if the master Industry record is later renamed.
   * An event belongs to exactly one industry.
   */
  industry: IMasterSnapshot;

  /** Scheduled date and time of the event. */
  eventDate: Date;

  /** Venue or location of the event (e.g. "Jakarta Convention Center"). */
  location: string | null;

  /** Current lifecycle status of the event. */
  status: EventStatus;

  /** The embedded registration form definition for this event. */
  registrationForm: {
    /** Optional display name for the registration form. */
    name: string | null;
    /**
     * Incremented each time the form is published.
     * Starts at 1. Frozen into Registration.formSnapshot.version on submit.
     */
    version: number;

    /** The ordered list of field definitions for this event's registration form. */
    fields: IRegistrationField[];

    /**
     * Timestamp when this form version was last published.
     * Null if the form has never been published (still in draft).
     */
    publishedAt: Date | null;
  };

  /**
   * Reference to the optional post-event survey for this event.
   * Null if no survey has been created yet.
   */
  surveyId: Types.ObjectId | null;

  /** The user who created this event. */
  createdBy: Types.ObjectId;

  /** The user who last updated this event. Null if never updated after creation. */
  updatedBy: Types.ObjectId | null;
}

const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      set: safeTrim,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      trim: true,
      default: null,
    },
    // Each event is tightly coupled to exactly one industry.
    // Using MasterSnapshotSchema keeps the display name stable even if the
    // master Industry record is renamed after the event is created.
    industry: {
      type: MasterSnapshotSchema,
      default: () => ({ refId: null, name: null }),
    },
    eventDate: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: STATUS.EVENT,
      default: "draft",
    },
    registrationForm: {
      name: {
        type: String,
        trim: true,
        default: null,
      },
      version: {
        type: Number,
        default: 1,
      },
      fields: {
        type: [RegistrationFieldSchema],
        default: [],
      },
      publishedAt: {
        type: Date,
        default: null,
      },
    },
    surveyId: {
      type: Schema.Types.ObjectId,
      ref: "Survey",
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "events",
  },
);

// --- Indexes ---

// Primary dashboard query — list events by status, sorted by most recent first.
EventSchema.index({ status: 1, eventDate: -1 });

// Category filtering — used in analytics and event browsing.
EventSchema.index({ category: 1 });

// Industry filtering — "show all events for this industry".
EventSchema.index({ "industry.refId": 1 });

// Slug uniqueness.
EventSchema.index({ slug: 1 }, { unique: true });

export const Event = model<IEvent>("Event", EventSchema);
