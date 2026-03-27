/**
 * @file participant.schema.ts
 * @description Schema for the centralized participant database.
 *
 * A participant represents a real-world person who registers for one or
 * more PT. XYZ events. This is their persistent profile record — it exists
 * independently of any specific event.
 *
 * Relationship to registrations:
 *   One participant → many registrations (one per event).
 *   The participant document holds the person's reusable profile data.
 *   Event-specific data (role, answers, ticket, check-in) lives in the
 *   Registration document — never here.
 *
 * Email fields:
 *   Two email fields are supported because participants often have both:
 *   - personalEmail: Gmail, Yahoo, etc. — used for personal follow-up
 *   - companyEmail:  Corporate domain — used for B2B communications
 *   At least one should be present, but neither is strictly required at
 *   the schema level to accommodate walk-in registrations.
 *   Application layer should enforce the "at least one email" rule.
 *
 * Deduplication:
 *   `identityFingerprint` is a service-generated hash (e.g. derived from
 *   normalizedFullName + companyEmail or phone) used to detect potential
 *   duplicate participant records before creating a new one.
 *   The deduplication logic lives in the service layer — this field is
 *   just the stored output of that logic.
 *
 * Snapshot fields (company, industry, jobTitle, city):
 *   These store both the master record reference (refId/companyId) and
 *   the display name at profile creation time. If the master record is
 *   later renamed, the participant's profile shows the name as it was
 *   when they registered — historically accurate.
 */

import { Schema, model } from "mongoose";
import { STATUS } from "../constants/enums.js";
import type { UserRole } from "../constants/enums.js";
import { lowerTrim, safeTrim } from "../helpers/transformers.js";
import { CompanySnapshotSchema } from "./sub/company-snapshot.schema.js";
import type { ICompanySnapshot } from "./sub/company-snapshot.schema.js";
import { MasterSnapshotSchema } from "./sub/master-snapshot.schema.js";
import type { IMasterSnapshot } from "./sub/master-snapshot.schema.js";
import { SourceChannelSchema } from "./sub/source-channel.schema.js";
import type { ISourceChannel } from "./sub/source-channel.schema.js";

export interface IParticipant {
  /** Full display name (e.g. "Budi Santoso"). */
  fullName: string;

  /**
   * Lowercased, trimmed version of `fullName`.
   * Used for case-insensitive search and deduplication matching.
   */
  normalizedFullName: string;

  /**
   * Personal email address (e.g. Gmail, Yahoo).
   * Null if not provided. Stored lowercase.
   */
  personalEmail: string | null;

  /**
   * Corporate/work email address.
   * Null if not provided. Stored lowercase.
   */
  companyEmail: string | null;

  /** Phone number. Null if not provided. */
  phone: string | null;

  /** Company the participant belongs to at profile creation time. */
  company: ICompanySnapshot;

  /** Industry snapshot at profile creation time. */
  industry: IMasterSnapshot;

  /** Job title snapshot at profile creation time. */
  jobTitle: IMasterSnapshot;

  /** City snapshot at profile creation time. */
  city: IMasterSnapshot;

  /**
   * The participant's default role across events.
   * Stored here as a convenience default — the actual role for each event
   * is always stored on the Registration document (participantType field).
   * Only "participant" and "exhibitor" are valid here.
   */
  defaultParticipantType: UserRole;

  /**
   * How the participant heard about PT. XYZ or the event.
   * Null if not collected.
   */
  sourceChannel: ISourceChannel | null;

  /**
   * Service-generated fingerprint for deduplication.
   * Derived from a combination of normalized name, email, and/or phone.
   * The exact derivation algorithm is defined in the participant service.
   * Null until the service layer assigns it.
   */
  identityFingerprint: string | null;

  /** Internal staff notes about this participant. Not visible to the participant. */
  notes: string | null;

  /**
   * Soft-delete flag.
   * Inactive participants are excluded from new registrations but their
   * existing registration records remain intact.
   */
  isActive: boolean;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      set: safeTrim,
    },
    normalizedFullName: {
      type: String,
      required: true,
      trim: true,
      set: lowerTrim,
    },
    personalEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      set: lowerTrim,
    },
    companyEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      set: lowerTrim,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    company: {
      type: CompanySnapshotSchema,
      default: () => ({}),
    },
    industry: {
      type: MasterSnapshotSchema,
      default: () => ({}),
    },
    jobTitle: {
      type: MasterSnapshotSchema,
      default: () => ({}),
    },
    city: {
      type: MasterSnapshotSchema,
      default: () => ({}),
    },
    defaultParticipantType: {
      type: String,
      enum: STATUS.USER_ROLE,
      default: "participant",
    },
    sourceChannel: {
      type: SourceChannelSchema,
      default: null,
    },
    identityFingerprint: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "participants",
  }
);

// --- Indexes ---

// Name search — case-insensitive full and partial name lookups.
ParticipantSchema.index({ normalizedFullName: 1 });

// Email lookups — used for deduplication checks and participant search.
ParticipantSchema.index({ personalEmail: 1 });
ParticipantSchema.index({ companyEmail: 1 });

// Phone lookup — used for deduplication and walk-in check.
ParticipantSchema.index({ phone: 1 });

// Company-based filtering — "show all participants from this company".
ParticipantSchema.index({ "company.companyId": 1 });

// Compound analytics index — "participants by industry and city".
ParticipantSchema.index({ "industry.refId": 1, "city.refId": 1 });

// Deduplication fingerprint lookup — fast exact-match check before creating
// a new participant to detect potential duplicates.
ParticipantSchema.index({ identityFingerprint: 1 });

export const Participant = model<IParticipant>("Participant", ParticipantSchema);