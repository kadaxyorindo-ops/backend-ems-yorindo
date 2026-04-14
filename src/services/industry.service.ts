/**
 * @file services/industry.service.ts
 * @description Business logic for industry master data endpoints.
 *
 * Industries are master/reference data managed by admins. This service
 * exposes a single read-only operation used to populate dropdowns in the
 * event creation and edit forms.
 *
 * Rules:
 *  - No Express types here — HTTP-agnostic.
 *  - Import models ONLY from "../models/index".
 */

import { Industry } from "../models/index";
import type { IIndustry } from "../models/schemas/industry.schema";

export type LeanIndustry = IIndustry & { _id: unknown };

/**
 * Returns all industry records sorted alphabetically by name.
 *
 * Used to populate the industry dropdown in the event creation and edit forms.
 * No pagination — the number of industries is small and bounded by the
 * master data set (typically < 50 records).
 */
export async function getAllIndustries(): Promise<LeanIndustry[]> {
  return Industry.find()
    .sort({ name: 1 })
    .lean<LeanIndustry[]>();
}

/**
 * Creates a new industry. Normalizes the name for case-insensitive uniqueness.
 * Throws a duplicate error (code 11000) if the name already exists —
 * the controller catches it and returns a 409.
 */
export async function createIndustry(name: string): Promise<LeanIndustry> {
  const trimmed = name.trim();
  const normalized = trimmed.toLowerCase();

  // Check for similar names before hitting the unique index.
  // "Similar" = normalized name contains or is contained by an existing one.
  const existing = await Industry.findOne({
    $or: [
      { normalizedName: normalized },
      { normalizedName: { $regex: `^${normalized}` } },
      { normalizedName: { $regex: normalized } },
    ],
  }).lean<LeanIndustry>();

  if (existing) {
    const err = new Error(`Industry is too similar to existing: "${existing.name}"`);
    (err as NodeJS.ErrnoException).code = "SIMILAR";
    throw err;
  }

  const doc = await new Industry({
    name: trimmed,
    normalizedName: normalized,
  }).save();

  return doc.toObject();
}
