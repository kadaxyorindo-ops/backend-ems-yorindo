import { Router } from "express";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import { analyticsEventParamsSchema } from "../validators/analytic.validators.ts";
import {
  handleGetEventSurveyAnalytics,
  handleGetEventSurveyInsight,
} from "../controllers/survey-analytic.controller.ts";

const router = Router();

router.get(
  "/events/:eventId",
  // requireAuth,
  // requirePermission("analytics:view"),
  validate(analyticsEventParamsSchema, "params"),
  handleGetEventSurveyAnalytics,
);

router.get(
  "/events/:eventId/insights",
  // requireAuth,
  // requirePermission("analytics:view"),
  validate(analyticsEventParamsSchema, "params"),
  handleGetEventSurveyInsight,
);

export default router;
