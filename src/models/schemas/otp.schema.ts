/**
 * @file otp.schema.ts
 * @description Schema for One-Time Password (OTP) records used to
 * authenticate internal PT. XYZ staff members.
 *
 * Authentication flow:
 *  1. Staff member submits their email on the login page.
 *  2. Server verifies the email exists in the users collection
 *     and the user's role is a SYSTEM_ROLE (not participant/exhibitor).
 *  3. Server generates a random OTP (e.g. 6-digit number), hashes it,
 *     and saves a new document to this collection.
 *  4. The raw OTP is sent to the user's email via the email service.
 *  5. Staff member submits the OTP on the verification page.
 *  6. Server finds the latest unused, unexpired OTP for that email,
 *     verifies the submitted OTP against the stored hash, and if valid:
 *     - Marks the OTP as used (isUsed: true)
 *     - Issues a session token (JWT or session cookie)
 *     - Updates lastLoginAt on the User document
 *  7. MongoDB TTL index automatically deletes expired OTP documents.
 *
 * Security considerations:
 *  - otpHash: NEVER store the raw OTP. Always hash it (bcrypt/argon2)
 *    the same way you would a password. If the DB is compromised, raw
 *    OTPs expose the ability to authenticate immediately.
 *  - attempts: After 3-5 failed guesses, set isUsed: true to invalidate
 *    the OTP. This prevents brute-force attacks on the 6-digit space.
 *  - expiresAt: Keep the window short (5 minutes recommended). The TTL
 *    index handles cleanup automatically — no cron job needed.
 *  - One active OTP per email: Before generating a new OTP, consider
 *    invalidating all existing unused OTPs for that email to prevent
 *    confusion from multiple valid codes existing simultaneously.
 */

import { Schema, model } from "mongoose";
import { STATUS } from "../constants/enums.js";
import type { OtpPurpose } from "../constants/enums.js";
import { lowerTrim } from "../helpers/transformers.js";

export interface IOtp {
  /**
   * The email address of the user requesting the OTP.
   * Stored lowercase. Matched against the users collection on verification.
   */
  email: string;

  /**
   * Bcrypt or Argon2 hash of the raw OTP code.
   * Never store or log the raw OTP — only this hash.
   */
  otpHash: string;

  /**
   * The purpose of this OTP.
   * Currently only "login" — extensible for future use cases (e.g. "2fa").
   */
  purpose: OtpPurpose;

  /**
   * Absolute expiry timestamp for this OTP.
   * Recommended: Date.now() + 5 minutes at creation time.
   * The MongoDB TTL index uses this field to auto-delete expired documents.
   */
  expiresAt: Date;

  /**
   * Whether this OTP has already been successfully used.
   * Set to true immediately after a successful verification to prevent reuse,
   * even if the OTP has not yet expired.
   * Also set to true when the attempts limit is reached.
   */
  isUsed: boolean;

  /**
   * Number of failed verification attempts for this OTP.
   * Increment on each wrong guess. Invalidate (isUsed: true) after
   * reaching the configured threshold (recommended: 5 attempts).
   */
  attempts: number;

  /**
   * IP address of the client that requested this OTP.
   * Stored for audit and security monitoring purposes.
   * Null if the IP could not be determined.
   */
  ipAddress: string | null;

  /**
   * Added by Mongoose timestamps.
   * Used by the auth service to enforce resend cooldowns.
   */
  createdAt?: Date;
  updatedAt?: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      set: lowerTrim,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: STATUS.OTP_PURPOSE,
      default: "login",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "otps",
  }
);

/**
 * TTL index — MongoDB automatically deletes OTP documents after
 * their `expiresAt` timestamp has passed.
 * `expireAfterSeconds: 0` means "delete exactly at expiresAt" with no
 * additional delay beyond MongoDB's TTL monitor interval (~60 seconds).
 *
 * This eliminates the need for a scheduled cleanup job.
 */
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Compound index for the verification lookup query:
 *   db.otps.findOne({ email, isUsed: false, expiresAt: { $gt: now } })
 *   sorted by createdAt descending to get the most recent OTP first.
 */
OtpSchema.index({ email: 1, isUsed: 1, createdAt: -1 });

export const Otp = model<IOtp>("Otp", OtpSchema);
