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
 *  - Import models ONLY from "../models/index.ts".
 */

import { Industry } from "../models/index.ts";
import type { IIndustry } from "../models/schemas/industry.schema.ts";

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