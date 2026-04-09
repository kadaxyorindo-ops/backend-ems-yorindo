/**
 * @file event-analytic-insight-cache.schema.ts
 * @description Cached AI insights for event analytics.
 *
 * The analytics insights endpoint may be called every time the analytics page is opened.
 * To avoid regenerating AI output on every page view, we cache one insight per event+month
 * and only regenerate when the client explicitly asks for refresh.
 */

import { Schema, model, Types } from "mongoose";

export interface IEventAnalyticInsightCache {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  /** Month label in YYYY-MM format (see event-analytic.service.ts). */
  month: string;
  summary: string;
  highlights: string[];
  recommendations: string[];
  generatedAt: Date;
}

const EventAnalyticInsightCacheSchema = new Schema<IEventAnalyticInsightCache>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
      default: "",
    },
    highlights: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
    },
    generatedAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: "event_analytic_insight_cache",
  },
);

EventAnalyticInsightCacheSchema.index(
  { eventId: 1, month: 1 },
  { unique: true },
);

export const EventAnalyticInsightCache = model<IEventAnalyticInsightCache>(
  "EventAnalyticInsightCache",
  EventAnalyticInsightCacheSchema,
);

