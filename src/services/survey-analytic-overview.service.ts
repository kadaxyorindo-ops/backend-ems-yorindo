/**
 * @file services/survey-analytic-overview.service.ts
 * @description Combined payload for survey analytics + insights (UI-friendly).
 */

import { SurveyResponse } from "../models/index";
import { LlmClientError } from "../utils/llmClient";
import type { SurveyAnalyticsInsight } from "./survey-analytic-insight.service";
import {
  SurveyInsightUnavailableError,
  getEventSurveyInsight,
} from "./survey-analytic-insight.service";
import {
  getEventSurveyAnalytics,
  type SurveyAnalyticsItem,
} from "./survey-analytic.service";

export interface EventSurveyAnalyticsOverviewResult {
  eventId: string;
  totalResponses: number;
  questionsAnalyzed: number;
  analytics: Record<string, SurveyAnalyticsItem>;
  insight: SurveyAnalyticsInsight | null;
  insightError: string | null;
}

export async function getEventSurveyAnalyticsOverview(
  eventId: string,
): Promise<EventSurveyAnalyticsOverviewResult | null> {
  const analyticsResult = await getEventSurveyAnalytics(eventId);
  if (!analyticsResult) return null;

  const totalResponses = await SurveyResponse.countDocuments({ eventId });

  let insight: SurveyAnalyticsInsight | null = null;
  let insightError: string | null = null;

  try {
    const insightResult = await getEventSurveyInsight(eventId);
    if (insightResult) {
      insight = insightResult.insight;
    }
  } catch (error) {
    if (error instanceof SurveyInsightUnavailableError) {
      insightError = error.message;
    } else if (error instanceof LlmClientError) {
      insightError = error.message;
    } else if (error instanceof Error) {
      insightError = error.message;
    } else {
      insightError = "Insight gagal diproses.";
    }
  }

  return {
    eventId,
    totalResponses,
    questionsAnalyzed: analyticsResult.totalDataAnalyzed,
    analytics: analyticsResult.analytics,
    insight,
    insightError,
  };
}
