/**
 * @file validators/analytic.validators.ts
 * @description Zod validation schemas for analytics endpoints.
 */

import { z } from "zod";
import { objectIdSchema } from "./event.validators";

export const analyticsEventParamsSchema = z.object({
  eventId: objectIdSchema,
});

export type AnalyticsEventParams = z.infer<typeof analyticsEventParamsSchema>;

export const analyticsOverviewQuerySchema = z.object({
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, "month must be in YYYY-MM format")
    .optional(),
});

export type AnalyticsOverviewQuery = z.infer<
  typeof analyticsOverviewQuerySchema
>;

function coerceRefresh(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "yes", "y"].includes(normalized);
  }
  return false;
}

export const analyticsInsightsQuerySchema = analyticsOverviewQuerySchema.extend({
  refresh: z.preprocess(coerceRefresh, z.boolean()).optional().default(false),
});

export type AnalyticsInsightsQuery = z.infer<
  typeof analyticsInsightsQuerySchema
>;
