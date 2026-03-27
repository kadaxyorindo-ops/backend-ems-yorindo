/**
 * @file job-title.schema.ts
 * @description Master data schema for job titles.
 *
 * Job titles are used to classify participants during registration
 * (e.g. "Software Engineer", "Marketing Manager", "CTO").
 *
 * This is a master/reference collection — records here are managed by
 * super_admin or admin only, and are referenced across the system via
 * MasterSnapshotSchema.
 *
 * Normalization strategy:
 *   Same pattern as IndustrySchema — `name` for display, `normalizedName`
 *   for case-insensitive uniqueness enforcement.
 *   Application layer is responsible for populating `normalizedName` from
 *   `name` before saving (e.g. name.trim().toLowerCase()).
 */

import { Schema, model } from "mongoose";
import { safeTrim, lowerTrim } from "../helpers/transformers.js";

export interface IJobTitle {
  /** Display name shown in the UI (e.g. "Software Engineer"). */
  name: string;

  /**
   * Lowercased, trimmed version of `name` used for unique constraint
   * and case-insensitive lookups.
   * Always derived from `name` — never set independently.
   */
  normalizedName: string;
}

const JobTitleSchema = new Schema<IJobTitle>(
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
    collection: "job_titles",
  }
);

// Case-insensitive uniqueness — prevents duplicate job titles
// regardless of how they were originally cased.
JobTitleSchema.index({ normalizedName: 1 }, { unique: true });

export const JobTitle = model<IJobTitle>("JobTitle", JobTitleSchema);