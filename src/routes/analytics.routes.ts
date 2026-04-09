/**
 * @file routes/analytics.routes.ts
 * @description Stub router for /analytics endpoints.
 *
 * This module is not yet implemented. All routes return 501 Not Implemented.
 * Replace the notImplemented handler with real controllers when the analytics
 * module is built by the assigned team.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import {
  requireAuth,
  requirePermission,
} from "../middlewares/auth.middleware.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import {
  analyticsEventParamsSchema,
  analyticsOverviewQuerySchema,
  analyticsInsightsQuerySchema,
} from "../validators/analytic.validators.ts";
import {
  handleGetEventAnalyticsOverview,
  handleGetEventParticipantAnalytics,
  handleGetEventAnalyticsInsights,
} from "../controllers/event-analytic.controller.ts";

const router = Router();

function notImplemented(_req: Request, res: Response) {
  res.status(501).json({
    success: false,
    message: "This feature is not yet available.",
  });
}

// GET / — analytics overview
router.get(
  "/",
  requireAuth,
  requirePermission("analytics:view"),
  notImplemented,
);

// GET /events/:eventId — per-event analytics
router.get(
  "/events/:eventId",
  requireAuth,
  requirePermission("analytics:view"),
  notImplemented,
);

// ============= ROUTE EVENT ANALYTICS ====================

router.get(
  "/events/:eventId/participants/summary",
  validate(analyticsEventParamsSchema, "params"),
  handleGetEventParticipantAnalytics,
);

router.get(
  "/events/:eventId/overview",
  validate(analyticsEventParamsSchema, "params"),
  validate(analyticsOverviewQuerySchema, "query"),
  handleGetEventAnalyticsOverview,
);

router.get(
  "/events/:eventId/insights",
  validate(analyticsEventParamsSchema, "params"),
  validate(analyticsInsightsQuerySchema, "query"),
  handleGetEventAnalyticsInsights,
);

export default router;
