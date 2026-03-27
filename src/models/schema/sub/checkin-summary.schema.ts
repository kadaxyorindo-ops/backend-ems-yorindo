/**
 * @file checkin-summary.schema.ts
 * @description Reusable sub-schema representing the check-in status of a
 * single registration at the event venue.
 *
 * Used in:
 *  - RegistrationSchema → checkIn
 *
 * This sub-document is initialized with default values when a registration
 * is created, and updated in-place when the participant physically arrives
 * and is scanned at the event.
 *
 * Relationship to ticket:
 *   The ticket (TicketSchema) carries the QR code used to identify the
 *   participant at the door. The checkIn sub-document records what happened
 *   when that QR code was scanned — who scanned it, when, and how.
 *   They are intentionally separate concerns.
 *
 * `scanMethod` is a free-text field (not an enum) to allow flexibility:
 *   - "qr"     → standard QR code scan (default)
 *   - "manual" → staff manually marked the participant as attended
 *   - "nfc"    → NFC tap (if supported by future hardware)
 *   New methods can be added without a schema migration.
 *
 * `_id: false` — embedded sub-document, no ObjectId needed.
 */

import { Schema, Types } from "mongoose";

export interface ICheckInSummary {
  /** Whether the participant physically attended the event. */
  isAttended: boolean;

  /** Timestamp when the participant was checked in. Null if not yet attended. */
  checkedInAt: Date | null;

  /**
   * Reference to the User (staff/scanner) who performed the check-in.
   * Null if not yet attended.
   */
  checkedInBy: Types.ObjectId | null;

  /**
   * How the check-in was performed.
   * Defaults to "qr". Other values: "manual", "nfc".
   * Free-text to allow future methods without schema changes.
   */
  scanMethod: string;

  /**
   * Optional staff notes recorded at check-in time.
   * Examples: "Arrived late", "VIP guest", "Replacement badge issued"
   */
  notes: string | null;
}

export const CheckInSummarySchema = new Schema<ICheckInSummary>(
  {
    isAttended: { type: Boolean, default: false },
    checkedInAt: { type: Date, default: null },
    checkedInBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    scanMethod: { type: String, trim: true, default: "qr" },
    notes: { type: String, trim: true, default: null },
  },
  { _id: false }
);