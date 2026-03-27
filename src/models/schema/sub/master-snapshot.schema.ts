/**
 * @file master-snapshot.schema.ts
 * @description Reusable sub-schema that stores a lightweight, point-in-time
 * snapshot of any master data reference (Industry, JobTitle, City) —
 * preserving both the ID link and the display name at the time the parent
 * document was created.
 *
 * Used in:
 *  - ParticipantSchema  → industry, jobTitle, city
 *  - RegistrationSchema → industrySnapshot, jobTitleSnapshot, citySnapshot
 *
 * Why a single generic schema for all three master types?
 *   Industry, JobTitle, and City all have the same shape for snapshotting
 *   purposes: an ObjectId reference and a name string. Using one shared
 *   schema avoids defining three near-identical sub-schemas.
 *
 *   The parent document's field name communicates which master type is
 *   referenced (e.g. `industry.refId` vs `city.refId`). The `ref` string
 *   on the ObjectId field is intentionally omitted here because this schema
 *   is reused across multiple master collections — the ref is implicit from
 *   context. If you need populated queries, use `.populate()` with an
 *   explicit model name override.
 *
 * Same snapshot rationale as CompanySnapshotSchema:
 *   Captures both the ID (for relational queries) and name (for historical
 *   display accuracy) at the time of document creation.
 *
 * `_id: false` — embedded sub-document, no ObjectId needed.
 */

import { Schema, Types } from "mongoose";

export interface IMasterSnapshot {
  /**
   * Reference to the master data document (Industry, JobTitle, or City).
   * Null if the value was entered as free text and not matched to a
   * master record, or if the field was left blank.
   */
  refId: Types.ObjectId | null;

  /**
   * The master data name as recorded at the time of this document's creation.
   * Preserved independently of the master record to ensure historical accuracy.
   */
  name: string | null;
}

export const MasterSnapshotSchema = new Schema<IMasterSnapshot>(
  {
    refId: { type: Schema.Types.ObjectId, default: null },
    name: { type: String, trim: true, default: null },
  },
  { _id: false }
);