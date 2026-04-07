import { Router } from "express";
import { validate } from "../middlewares/validate.middleware.ts";
import {
  analyticsEventParamsSchema,
  analyticsOverviewQuerySchema,
} from "../validators/analytic.validators.ts";
import {
  handleGetEventAnalyticsOverview,
  handleGetEventParticipantAnalytics,
  handleGetEventAnalyticsInsights,
} from "../controllers/event-analytic.controller.ts";

const router = Router();

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
  validate(analyticsOverviewQuerySchema, "query"),
  handleGetEventAnalyticsInsights,
);

export default router;
