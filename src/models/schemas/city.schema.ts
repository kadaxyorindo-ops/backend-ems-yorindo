/**
 * @file city.schema.ts
 * @description Master data schema for cities.
 *
 * Cities are used to record the location/origin of participants
 * and are referenced across the system via MasterSnapshotSchema.
 *
 * This is a master/reference collection — records here are managed by
 * super_admin or admin only.
 *
 * Normalization strategy:
 *   Same pattern as IndustrySchema — `name` for display, `normalizedName`
 *   for case-insensitive uniqueness enforcement.
 *
 * Geographic context:
 *   `province` and `country` are optional supplementary fields to
 *   disambiguate cities with the same name (e.g. "Bandung" in West Java,
 *   Indonesia). They are stored for display and filtering purposes only —
 *   they are not normalized or indexed since city-level lookups are
 *   sufficient for this system's analytics needs.
 */

import { Schema, model } from "mongoose";
import { safeTrim, lowerTrim } from "../helpers/transformers.js";

export interface ICity {
  /** Display name of the city (e.g. "Jakarta", "Bandung"). */
  name: string;

  /**
   * Lowercased, trimmed version of `name` used for unique constraint
   * and case-insensitive lookups.
   * Always derived from `name` — never set independently.
   */
  normalizedName: string;

  /** Province or state the city belongs to (e.g. "DKI Jakarta"). Optional. */
  province: string | null;

  /** Country the city belongs to (e.g. "Indonesia"). Optional. */
  country: string | null;
}

const CitySchema = new Schema<ICity>(
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
    province: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "cities",
  }
);

// Case-insensitive uniqueness on city name.
// Note: if two cities share the same name in different provinces
// (e.g. two cities named "Sukabumi"), consider making this a compound
// index on { normalizedName, province } instead.
CitySchema.index({ normalizedName: 1 }, { unique: true });

export const City = model<ICity>("City", CitySchema);