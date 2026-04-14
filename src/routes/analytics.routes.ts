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
import {
  handleGetEventSurveyAnalytics,
  handleGetEventSurveyAnalyticsOverview,
  handleGetEventSurveyInsight,
} from "../controllers/survey-analytic.controller.ts";
import { handleGetEventFeedbackAnalytics } from "../controllers/FeedbackController.ts";

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

// ============================
// Event Analytics
// ============================
// Fokus: data event (participants, overview, insights).

router.get(
  // Event: ringkasan peserta
  "/events/:eventId/participants/summary",
  validate(analyticsEventParamsSchema, "params"),
  handleGetEventParticipantAnalytics,
);

router.get(
  // Event: overview
  "/events/:eventId/overview",
  validate(analyticsEventParamsSchema, "params"),
  validate(analyticsOverviewQuerySchema, "query"),
  handleGetEventAnalyticsOverview,
);

router.get(
  // Event: insights
  "/events/:eventId/insights",
  validate(analyticsEventParamsSchema, "params"),
  validate(analyticsInsightsQuerySchema, "query"),
  handleGetEventAnalyticsInsights,
);

// ============================
// Survey Analytics
// ============================
// Fokus: hasil survey untuk event + AI insight.

router.get(
  // Survey: analytics
  "/events/:eventId/survey",
  validate(analyticsEventParamsSchema, "params"),
  handleGetEventSurveyAnalytics,
);

router.get(
  // Survey: overview (insight sections + analytics)
  "/events/:eventId/survey/overview",
  validate(analyticsEventParamsSchema, "params"),
  handleGetEventSurveyAnalyticsOverview,
);

router.get(
  // Survey: AI insight
  "/events/:eventId/survey/insights",
  validate(analyticsEventParamsSchema, "params"),
  handleGetEventSurveyInsight,
);

router.get(
  // Feedback: analytics
  "/events/:eventId/feedback",
  validate(analyticsEventParamsSchema, "params"),
  handleGetEventFeedbackAnalytics,
);

export default router;
