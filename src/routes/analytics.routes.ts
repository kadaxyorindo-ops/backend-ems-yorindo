/**
 * @file routes/analytics.routes.ts
 * @description Router for /analytics endpoints.
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
import { getEventSurveyAnalytics } from "../controllers/analytics.controller.ts";

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

// ============= ROUTE SURVEY ANALYTICS (SurveyResponse) ====================

router.get(
  "/events/:eventId/survey",
  validate(analyticsEventParamsSchema, "params"),
  getEventSurveyAnalytics,
);

router.get(
  "/events/:eventId/survey/ai-insight",
  validate(analyticsEventParamsSchema, "params"),
  validate(analyticsInsightsQuerySchema, "query"),
  generateEventAIInsight,
);

export default router;
