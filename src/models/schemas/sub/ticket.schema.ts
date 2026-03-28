/**
 * @file ticket.schema.ts
 * @description Reusable sub-schema representing the QR code ticket issued
 * to a participant after their registration is approved.
 *
 * Used in:
 *  - RegistrationSchema → ticket
 *
 * Lifecycle:
 *   1. Registration is submitted → ticket field is null (no ticket yet)
 *   2. Registration is approved  → ticket is generated and populated here
 *   3. Participant checks in     → ticket.isActive remains true; checkIn
 *      sub-document is updated instead
 *   4. Ticket is reissued        → old ticket's isActive is set to false,
 *      reissueCount is incremented, and a new ticket document replaces it
 *
 * Security notes:
 *  - `qrCode` is the unique string encoded into the QR image (e.g. a UUID
 *    or HMAC-signed token). It is indexed with a unique constraint on the
 *    parent RegistrationSchema to prevent duplicates across all registrations.
 *  - `qrPayload` is optional additional data embedded in the QR code beyond
 *    the code itself (e.g. a signed JWT). May be null if qrCode is sufficient.
 *  - `reissueCount` should trigger a security alert if it exceeds a threshold
 *    (e.g. 3+), as excessive reissuance may indicate QR code sharing or abuse.
 *
 * `_id: false` — embedded sub-document, no ObjectId needed.
 */

import { Schema } from "mongoose";

export interface ITicket {
  /**
   * The unique string value encoded in the QR code image.
   * Used as the lookup key during check-in scanning.
   * Must be globally unique across all registrations.
   */
  qrCode: string;

  /**
   * Optional additional payload embedded in the QR code
   * (e.g. a signed JWT for tamper-proof verification).
   * Null if the qrCode value alone is sufficient for check-in.
   */
  qrPayload?: string;

  /** Timestamp when this ticket was first generated. */
  issuedAt: Date;

  /**
   * Number of times this ticket has been reissued.
   * Starts at 0 (original issuance). Incremented on each reissue.
   * High values should be flagged for review.
   */
  reissueCount: number;

  /**
   * Whether this ticket is currently valid for check-in.
   * Set to false when a ticket is reissued — only the latest
   * ticket for a registration should have isActive: true.
   */
  isActive: boolean;
}

export const TicketSchema = new Schema<ITicket>(
  {
    qrCode: { type: String, required: true, trim: true },
    qrPayload: { type: String, trim: true },
    issuedAt: { type: Date, default: Date.now },
    reissueCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);