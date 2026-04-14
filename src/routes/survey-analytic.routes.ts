import { Router } from "express";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { analyticsEventParamsSchema } from "../validators/analytic.validators";
import {
  handleGetEventSurveyAnalytics,
  handleGetEventSurveyAnalyticsOverview,
  handleGetEventSurveyInsight,
} from "../controllers/survey-analytic.controller";

const router = Router();

router.get(
  "/events/:eventId",
  // requireAuth,
  // requirePermission("analytics:view"),
  validate(analyticsEventParamsSchema, "params"),
  handleGetEventSurveyAnalytics,
);

router.get(
  "/events/:eventId/overview",
  validate(analyticsEventParamsSchema, "params"),
  handleGetEventSurveyAnalyticsOverview,
);

router.get(
  "/events/:eventId/insights",
  // requireAuth,
  // requirePermission("analytics:view"),
  validate(analyticsEventParamsSchema, "params"),
  handleGetEventSurveyInsight,
);

export default router;
