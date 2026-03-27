/**
 * @file company-snapshot.schema.ts
 * @description Reusable sub-schema that stores a lightweight, point-in-time
 * snapshot of a company reference — preserving both the ID link and the
 * display name at the time the parent document was created.
 *
 * Used in:
 *  - ParticipantSchema    → company
 *  - RegistrationSchema   → companySnapshot
 *
 * Why snapshots instead of just storing a reference (ObjectId)?
 *   If we only stored `companyId`, displaying a participant's company name
 *   would require a JOIN (populate) every time. More importantly, if a
 *   company record is later renamed or deleted, historical records would
 *   show the wrong name or break entirely.
 *
 *   By capturing both the `companyId` (for relational linking) and `name`
 *   (for display), we get the best of both worlds:
 *    - The ID allows cross-referencing with the companies collection
 *      (e.g. "show all registrations from this company")
 *    - The name is always accurate for the point in time it was recorded
 *
 * Both fields are nullable — a participant may not belong to a company,
 * or the company may not yet exist in the master companies collection
 * (e.g. a free-text company name entered during registration).
 *
 * `_id: false` — embedded sub-document, no ObjectId needed.
 */

import { Schema, Types } from "mongoose";

export interface ICompanySnapshot {
  /**
   * Reference to the Company document in the companies collection.
   * Null if the company was entered as free text and not matched to
   * an existing master record.
   */
  companyId: Types.ObjectId | null;

  /**
   * The company name as recorded at the time of this document's creation.
   * Preserved independently of the master record to ensure historical accuracy.
   */
  name: string | null;
}

export const CompanySnapshotSchema = new Schema<ICompanySnapshot>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", default: null },
    name: { type: String, trim: true, default: null },
  },
  { _id: false }
);