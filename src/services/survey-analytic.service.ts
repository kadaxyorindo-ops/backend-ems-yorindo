/**
 * @file services/survey-analytic.service.ts
 * @description Aggregation helpers for event survey analytics.
 */

import { Types } from "mongoose";
import type { SurveyQuestionType } from "../models/constants/enums.ts";
import { Event, SurveyResponse } from "../models/index.ts";

export interface SurveyAnalyticsItem {
  type: "chart" | "text_list";
  data: Record<string, number> | string[];
}

export interface EventSurveyAnalyticsResult {
  eventId: string;
  totalDataAnalyzed: number;
  analytics: Record<string, SurveyAnalyticsItem>;
}

type RawSurveyAnswerRow = {
  questionId: string;
  label: unknown;
  type: unknown;
  value: unknown;
};

type SupportedAnalyticsType = "text_list" | "chart";

type AggregatedQuestion = {
  questionId: string;
  label: string;
  type: SupportedAnalyticsType;
  responses: string[];
  counts: Record<string, number>;
};

const TEXT_TYPES = new Set<SurveyQuestionType>(["text", "textarea"]);
const CHART_TYPES = new Set<SurveyQuestionType>(["select", "radio", "checkbox"]);

function toAnswerLabel(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "(Tanpa Jawaban)";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === null || value === undefined) {
    return "(Tanpa Jawaban)";
  }

  return JSON.stringify(value);
}

function toSupportedAnalyticsType(type: unknown): SupportedAnalyticsType | null {
  if (typeof type !== "string") {
    return null;
  }

  if (TEXT_TYPES.has(type as SurveyQuestionType)) {
    return "text_list";
  }

  if (CHART_TYPES.has(type as SurveyQuestionType)) {
    return "chart";
  }

  return null;
}

function normalizeAnswerValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toAnswerLabel(item));
  }

  return [toAnswerLabel(value)];
}

function createUniqueQuestionKey(
  analytics: Record<string, SurveyAnalyticsItem>,
  label: string,
  questionId: string,
): string {
  if (!(label in analytics)) {
    return label;
  }

  return `${label} (${questionId})`;
}

export async function getEventSurveyAnalytics(
  eventId: string,
): Promise<EventSurveyAnalyticsResult | null> {
  const event = await Event.findById(eventId).select("_id").lean();
  if (!event) {
    return null;
  }

  const rawAnswers = await SurveyResponse.aggregate<RawSurveyAnswerRow>([
    { $match: { eventId: new Types.ObjectId(eventId) } },
    { $unwind: { path: "$answers", preserveNullAndEmptyArrays: false } },
    {
      $project: {
        questionId: "$answers.questionId",
        label: "$answers.label",
        type: "$answers.type",
        value: "$answers.value",
      },
    },
    {
      $match: { questionId: { $ne: null } },
    },
  ]);

  const groupedQuestions = new Map<string, AggregatedQuestion>();

  rawAnswers.forEach((answer) => {
    const analyticsType = toSupportedAnalyticsType(answer.type);
    if (!analyticsType) {
      return;
    }

    const questionId = String(answer.questionId).trim();
    if (!questionId) {
      return;
    }

    const fallbackLabel = "Pertanyaan Tanpa Judul";
    const questionLabel =
      typeof answer.label === "string" && answer.label.trim().length > 0
        ? answer.label.trim()
        : fallbackLabel;

    const existing = groupedQuestions.get(questionId);
    const question =
      existing ??
      ({
        questionId,
        label: questionLabel,
        type: analyticsType,
        responses: [],
        counts: {},
      } satisfies AggregatedQuestion);

    if (!existing) {
      groupedQuestions.set(questionId, question);
    } else if (question.label === fallbackLabel && questionLabel !== fallbackLabel) {
      question.label = questionLabel;
    }

    const normalizedValues = normalizeAnswerValues(answer.value);

    if (analyticsType === "text_list") {
      question.responses.push(...normalizedValues);
      return;
    }

    normalizedValues.forEach((value) => {
      question.counts[value] = (question.counts[value] ?? 0) + 1;
    });
  });

  const analytics: Record<string, SurveyAnalyticsItem> = {};

  groupedQuestions.forEach((question) => {
    const questionKey = createUniqueQuestionKey(
      analytics,
      question.label,
      question.questionId,
    );

    if (question.type === "text_list") {
      analytics[questionKey] = {
        type: "text_list",
        data: question.responses,
      };
      return;
    }

    analytics[questionKey] = {
      type: "chart",
      data: question.counts,
    };
  });

  return {
    eventId,
    totalDataAnalyzed: groupedQuestions.size,
    analytics,
  };
}
