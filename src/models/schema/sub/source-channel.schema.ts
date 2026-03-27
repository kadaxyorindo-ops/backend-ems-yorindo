/**
 * @file source-channel.schema.ts
 * @description Reusable sub-schema representing how a participant heard about
 * the event or the organization.
 *
 * Used in:
 *  - ParticipantSchema → sourceChannel
 *
 * Design rationale — why `code` + `otherText` instead of a single string:
 *   Source channels are a fixed list (e.g. "IG", "LinkedIn", "Friend") that
 *   the analytics dashboard groups and aggregates. Using a structured `code`
 *   field instead of free text ensures consistent grouping.
 *
 *   The `otherText` field exists specifically for when `code` is "Other" —
 *   allowing the participant to describe a channel not in the predefined list.
 *   This field should be ignored (left null) for all other code values.
 *
 * Source channel codes are not stored in a master collection — they are
 * managed as a configuration value in the application layer (e.g. a config
 * file or environment variable). This keeps the schema simple and avoids an
 * extra collection for a rarely-changing list.
 *
 * `_id: false` — embedded sub-document, no ObjectId needed.
 */

import { Schema } from "mongoose";

export interface ISourceChannel {
  /**
   * A short, standardized code identifying the channel.
   * Examples: "IG", "LinkedIn", "Friend", "Email", "Other"
   * The allowed values are managed in the application config, not the schema.
   */
  code: string;

  /**
   * Free-text description provided by the participant when code is "Other".
   * Must be null for all other code values.
   */
  otherText: string | null;
}

export const SourceChannelSchema = new Schema<ISourceChannel>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    otherText: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);