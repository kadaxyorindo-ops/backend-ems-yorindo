/**
 * @file user.schema.ts
 * @description Schema for internal PT. XYZ staff accounts.
 *
 * These are the people who log in to the internal dashboard to manage
 * events, review registrations, approve participants, and perform check-ins.
 *
 * Important distinctions:
 *  - This collection is for INTERNAL USERS ONLY (PT. XYZ staff).
 *  - Participants (visitors/exhibitors) are stored in the participants
 *    collection — they do NOT have user accounts here.
 *  - Authentication is handled via OTP — there is no passwordHash field.
 *    See otp.schema.ts for the OTP flow.
 *
 * Role access levels (from most to least privileged):
 *  - super_admin → full system access including user management
 *  - admin       → manages events and registrations; cannot manage users
 *  - staff       → handles day-to-day registration review and approvals
 *  - scanner     → limited access; can only perform check-in scanning
 *
 * Note: "participant" and "exhibitor" roles exist in STATUS.USER_ROLE
 * for registration record-keeping purposes, but should NEVER be assigned
 * to documents in this collection. Use STATUS.SYSTEM_ROLE in middleware
 * to enforce this boundary.
 */

import { Schema, model } from "mongoose";
import { STATUS } from "../constants/enums.js";
import type { UserRole } from "../constants/enums.js"
import { lowerTrim, safeTrim } from "../helpers/transformers.js";

export interface IUser {
  /** Full display name of the staff member (e.g. "Budi Santoso"). */
  name: string;

  /**
   * Work email address — the primary identifier for login.
   * Stored lowercase. Must be unique across all user accounts.
   */
  email: string;

  /**
   * The staff member's role — determines what they can access in the system.
   * Must be one of the SYSTEM_ROLE values only (super_admin, admin, staff, scanner).
   * Application layer must enforce this — schema allows all USER_ROLE values
   * but middleware must reject participant/exhibitor on login.
   */
  role: UserRole;

  /**
   * The organization or department this user belongs to.
   * Optional — used for display purposes only (e.g. "Operations Team").
   */
  organizationName: string | null;

  /**
   * Soft-delete flag. Deactivated users cannot log in but their records
   * are preserved for audit log integrity (actorUserId references).
   */
  isActive: boolean;

  /**
   * Timestamp of the user's most recent successful login.
   * Updated after each successful OTP verification.
   * Null if the user has never logged in.
   */
  lastLoginAt: Date | null;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      set: safeTrim,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      set: lowerTrim,
    },
    // passwordHash intentionally omitted — system uses OTP-only login.
    // See otp.schema.ts for the authentication flow.
    role: {
      type: String,
      required: true,
      // Enum allows all USER_ROLE values at the schema level.
      // Auth middleware must enforce SYSTEM_ROLE boundary on login.
      enum: STATUS.USER_ROLE,
      default: "admin",
    },
    organizationName: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Primary lookup — email must be globally unique across all user accounts.
UserSchema.index({ email: 1 }, { unique: true });

// Supports filtering active users in admin user management screens.
UserSchema.index({ isActive: 1, role: 1 });

export const User = model<IUser>("User", UserSchema);