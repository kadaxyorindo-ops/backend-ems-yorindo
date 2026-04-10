/**
 * @file event-feedback.schema.ts
 * @description Schema for participant feedback after attending an event.
 *
 * This collection is intended for post-event satisfaction / experience analytics.
 */

import { Schema, model, Types } from "mongoose";

export interface IEventFeedback {
  eventId: Types.ObjectId;
  participantId: Types.ObjectId;

  overallExperience: number; // 1-5
  expectationMatch: number; // 1-5
  contentQuality: number; // 1-5
  speaker: number; // 1-5
  eventFlow: number; // 1-5
  logistics: number; // 1-5

  willJoinAgain: boolean;
  comment?: string;
}

function ratingField(): {
  type: NumberConstructor;
  required: true;
  min: number;
  max: number;
} {
  return {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  };
}

const EventFeedbackSchema = new Schema<IEventFeedback>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    participantId: {
      type: Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
      index: true,
    },

    overallExperience: ratingField(),
    expectationMatch: ratingField(),
    contentQuality: ratingField(),
    speaker: ratingField(),
    eventFlow: ratingField(),
    logistics: ratingField(),

    willJoinAgain: {
      type: Boolean,
      required: true,
    },
    comment: {
      type: String,
      default: undefined,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    collection: "event_feedbacks",
  }
);

// --- Indexes ---

// Common analytics query pattern: per-event feedback sorted newest-first.
EventFeedbackSchema.index({ eventId: 1, createdAt: -1 });

// Participant history: all feedbacks from a participant.
EventFeedbackSchema.index({ participantId: 1, createdAt: -1 });

export const EventFeedback = model<IEventFeedback>("EventFeedback", EventFeedbackSchema);

