/**
 * @file audit-log.schema.ts
 * @description Schema for the system-wide audit log.
 *
 * Every meaningful state change in the system is recorded here — who did
 * what, to which entity, and when. This collection is append-only —
 * audit log documents are NEVER updated or deleted after creation.
 *
 * Design principles:
 *
 * 1. Append-only — application layer must never update or delete audit logs.
 *    They are a tamper-evident record. Consider adding a MongoDB role that
 *    explicitly denies update/delete on this collection in production.
 *
 * 2. `actorUserId` is nullable — some actions are performed by the system
 *    itself rather than a human user (e.g. automated ticket generation,
 *    TTL-based cleanup). In these cases, actorUserId is null and the
 *    metadata field should describe the system action.
 *
 * 3. `entityId` is typed as Mixed (not ObjectId) — this is a fix from the
 *    schema review. While all current entities use ObjectId as their _id,
 *    using Mixed future-proofs the schema against entities that might use
 *    a different key type (e.g. string slugs).
 *
 * 4. `metadata` is a flexible Mixed field — use it to store before/after
 *    values on updates, rejection reasons on rejects, export parameters,
 *    or any other action-specific context. Keep the structure consistent
 *    per action type — document the expected shape in the service layer.
 *
 * 5. `eventId` and `registrationId` are optional convenience denormalization
 *    fields. They allow efficient queries like "all audit events for event X"
 *    without knowing which entityType to filter on. Set them whenever the
 *    action is related to an event or registration.
 *
 * Retention:
 *   Audit logs should be retained indefinitely (no TTL index).
 *   For high-volume systems, consider archiving old logs to cold storage
 *   rather than deleting them.
 */

import { Schema, model, Types } from "mongoose";
import { STATUS } from "../constants/enums.js";
import type { AuditAction } from "../constants/enums.js";

export interface IAuditLog {
  /**
   * The internal user who performed the action.
   * Null for system-generated actions (e.g. automated processes).
   */
  actorUserId: Types.ObjectId | null;

  /** The type of action that was performed. */
  action: AuditAction;

  /**
   * The type of entity that was affected.
   * Used together with `entityId` to identify the specific document.
   */
  entityType:
    | "user"
    | "participant"
    | "company"
    | "event"
    | "registration"
    | "survey"
    | "survey_response";

  /**
   * The _id of the affected document.
   * Typed as unknown (Mixed) to support both ObjectId and potential
   * future non-ObjectId identifiers. Cast appropriately when querying.
   */
  entityId: unknown;

  /**
   * Optional reference to the event context of this action.
   * Set whenever the action is related to an event — enables fast
   * "all activity for event X" queries without filtering by entityType.
   */
  eventId: Types.ObjectId | null;

  /**
   * Optional reference to the registration context of this action.
   * Set for approve, reject, check_in actions — enables fast
   * "all activity for registration X" queries.
   */
  registrationId: Types.ObjectId | null;

  /**
   * Action-specific supplementary data.
   * Examples:
   *   - update: { before: {...}, after: {...} }
   *   - reject:  { reason: "Incomplete information" }
   *   - export:  { format: "csv", rowCount: 250, filters: {...} }
   *   - login:   { userAgent: "..." }
   * Shape is defined per action type in the audit service.
   */
  metadata: Record<string, unknown>;

  /**
   * IP address of the client that triggered this action.
   * Null for system-generated actions or if IP cannot be determined.
   */
  ipAddress: string | null;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: STATUS.AUDIT_ACTION,
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        "user",
        "participant",
        "company",
        "event",
        "registration",
        "survey",
        "survey_response",
      ],
    },
    // Fix from schema review: changed from ObjectId to Mixed to support
    // non-ObjectId entity identifiers in the future.
    entityId: {
      type: Schema.Types.Mixed,
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: "Registration",
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "audit_logs",
  }
);

// --- Indexes ---

// Primary audit query — "full history of entity X" (e.g. view all changes
// to a specific registration), sorted most recent first.
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

// Actor history — "all actions performed by user X".
AuditLogSchema.index({ actorUserId: 1, createdAt: -1 });

// Event audit trail — "all activity related to event X".
AuditLogSchema.index({ eventId: 1, createdAt: -1 });

// Registration audit trail — "all activity related to registration X".
AuditLogSchema.index({ registrationId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>("AuditLog", AuditLogSchema);