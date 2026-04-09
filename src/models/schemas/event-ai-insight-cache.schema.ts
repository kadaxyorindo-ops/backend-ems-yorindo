/**
 * @file event-ai-insight-cache.schema.ts
 * @description Cached markdown AI insight for an event's survey analytics.
 *
 * This cache prevents regenerating AI insight every time the analytics page is opened.
 * The client can force regeneration via `?refresh=1` on the endpoint.
 */

import { Schema, model, Types } from "mongoose";

export interface IEventAiInsightCache {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  insight: string;
  generatedAt: Date;
}

const EventAiInsightCacheSchema = new Schema<IEventAiInsightCache>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
      index: true,
    },
    insight: {
      type: String,
      required: true,
      default: "",
    },
    generatedAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: "event_ai_insight_cache",
  },
);

export const EventAiInsightCache = model<IEventAiInsightCache>(
  "EventAiInsightCache",
  EventAiInsightCacheSchema,
);

