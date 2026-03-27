/**
 * @file company.schema.ts
 * @description Master data schema for companies.
 *
 * Companies represent the organizations that participants belong to.
 * They are referenced across the system via CompanySnapshotSchema.
 *
 * Key differences from other master data schemas (Industry, JobTitle, City):
 *
 * 1. `normalizedName` is NOT unique here (unlike other master schemas).
 *    Multiple companies can share the same normalized name — for example,
 *    "PT Maju Bersama" might have multiple branches registered separately.
 *    This is an intentional design decision documented during schema review.
 *    Deduplication is handled at the application/service layer using
 *    `identityFingerprint` on the Participant, not at the DB constraint level.
 *
 * 2. Companies carry their own `industry` snapshot (refId + name).
 *    This avoids a JOIN when displaying a company's industry, while still
 *    maintaining the link to the master Industry record.
 *
 * 3. `isActive` allows soft-deletion — deactivating a company without
 *    breaking existing participant or registration records that reference it.
 */

import { Schema, model, Types } from "mongoose";
import { safeTrim, lowerTrim } from "../helpers/transformers.js";

export interface ICompany {
  /** Display name of the company (e.g. "PT Maju Bersama"). */
  name: string;

  /**
   * Lowercased, trimmed version of `name`.
   * Used for searching and fuzzy deduplication — NOT a unique constraint.
   * Multiple companies may share the same normalized name (e.g. branches).
   */
  normalizedName: string;

  /**
   * The industry this company belongs to.
   * Stored as a snapshot (refId + name) to avoid a JOIN on read.
   */
  industry: {
    /** Reference to the Industry master document. Null if unclassified. */
    masterId: Types.ObjectId | null;
    /** Industry name at the time this company record was created/updated. */
    name: string | null;
  };

  /** Company website URL. Optional. */
  website: string | null;

  /** Company main phone number. Optional. */
  phone: string | null;

  /**
   * Soft-delete flag. Inactive companies are hidden from selection
   * dropdowns but preserved for historical record integrity.
   */
  isActive: boolean;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      set: safeTrim,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      set: lowerTrim,
    },
    industry: {
      masterId: {
        type: Schema.Types.ObjectId,
        ref: "Industry",
        default: null,
      },
      name: {
        type: String,
        trim: true,
        default: null,
      },
    },
    website: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
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
    collection: "companies",
  }
);

// Non-unique index — supports search and deduplication queries
// without enforcing uniqueness (multiple branches allowed).
CompanySchema.index({ normalizedName: 1 });

// Supports filtering active companies in dropdown/search UIs.
CompanySchema.index({ isActive: 1 });

export const Company = model<ICompany>("Company", CompanySchema);