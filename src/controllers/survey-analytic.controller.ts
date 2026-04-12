/**
 * @file controllers/survey-analytic.controller.ts
 * @description HTTP handlers for survey analytics endpoints.
 */

import type { NextFunction, Request, Response } from "express";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";
import type { AnalyticsEventParams } from "../validators/analytic.validators.ts";
import { getEventSurveyAnalytics } from "../services/survey-analytic.service.ts";
import { getEventSurveyInsight } from "../services/survey-analytic-insight.service.ts";

export async function handleGetEventSurveyAnalytics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as AnalyticsEventParams;
    const result = await getEventSurveyAnalytics(eventId);

    if (!result) {
      sendError(res, 404, "Event tidak ditemukan");
      return;
    }

    sendSuccess(res, 200, "Data analitik survey berhasil di-generate", result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetEventSurveyInsight(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as AnalyticsEventParams;
    const result = await getEventSurveyInsight(eventId);

    if (!result) {
      sendError(res, 404, "Event tidak ditemukan");
      return;
    }

    sendSuccess(res, 200, "AI Insight berhasil di-generate", result);
  } catch (error) {
    next(error);
  }
}
