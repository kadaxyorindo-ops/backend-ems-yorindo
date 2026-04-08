/**
 * @file controllers/event-analytic.controller.ts
 * @description HTTP handlers for event analytics endpoints.
 */

import type { Request, Response, NextFunction } from "express";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";
import type {
  AnalyticsEventParams,
  AnalyticsOverviewQuery,
} from "../validators/analytic.validators.ts";
import {
  getEventParticipantAnalytics,
  getEventAnalyticsOverview,
} from "../services/event-analytic.service.ts";
import { getEventAnalyticsInsights } from "../services/event-analytic-insight.service.ts";

export async function handleGetEventParticipantAnalytics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as AnalyticsEventParams;
    const result = await getEventParticipantAnalytics(eventId);

    if (!result) {
      sendError(res, 404, "Event not found");
      return;
    }

    sendSuccess(res, 200, "Event analytics fetched", result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetEventAnalyticsOverview(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as AnalyticsEventParams;
    const { month } = res.locals.parsed.query as AnalyticsOverviewQuery;
    const result = await getEventAnalyticsOverview(eventId, month);

    if (!result) {
      sendError(res, 404, "Event not found");
      return;
    }

    sendSuccess(res, 200, "Event analytics overview fetched", result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetEventAnalyticsInsights(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as AnalyticsEventParams;
    const { month } = res.locals.parsed.query as AnalyticsOverviewQuery;
    const result = await getEventAnalyticsInsights(eventId, month);

    if (!result) {
      sendError(res, 404, "Event not found");
      return;
    }

    sendSuccess(res, 200, "Event analytics insights fetched", result);
  } catch (error) {
    next(error);
  }
}
