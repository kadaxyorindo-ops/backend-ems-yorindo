/**
 * @file industry.schema.ts
 * @description Master data schema for industries.
 *
 * Industries are used to classify participants and companies
 * (e.g. "Technology", "Healthcare", "Manufacturing").
 *
 * This is a master/reference collection — records here are managed by
 * super_admin or admin only, and are referenced (not duplicated) across
 * the system via MasterSnapshotSchema.
 *
 * Normalization strategy:
 *   Both `name` (display) and `normalizedName` (lowercase, trimmed) are
 *   stored. The unique index is on `normalizedName` to enforce case-insensitive
 *   uniqueness — "Technology" and "technology" are the same industry.
 *   Application layer is responsible for populating `normalizedName` from `name`
 *   before saving (e.g. name.trim().toLowerCase()).
 */

import { Schema, model } from "mongoose";
import { safeTrim, lowerTrim } from "../helpers/transformers.js";

export interface IIndustry {
  /** Display name shown in the UI (e.g. "Information Technology"). */
  name: string;

  /**
   * Lowercased, trimmed version of `name` used for unique constraint
   * and case-insensitive lookups.
   * Always derived from `name` — never set independently.
   */
  normalizedName: string;
}

const IndustrySchema = new Schema<IIndustry>(
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
  },
  {
    timestamps: true,
    collection: "industries",
  }
);

// Case-insensitive uniqueness — prevents duplicate industries
// regardless of how they were originally cased.
IndustrySchema.index({ normalizedName: 1 }, { unique: true });

export const Industry = model<IIndustry>("Industry", IndustrySchema);