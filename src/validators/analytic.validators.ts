/**
 * @file validators/analytic.validators.ts
 * @description Zod validation schemas for analytics endpoints.
 */

import { z } from "zod";
import { objectIdSchema } from "./event.validators.ts";

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
