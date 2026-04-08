/**
 * @file services/survey-analytic.service.ts
 * @description Aggregation helpers for event survey analytics.
 */

import { Types } from "mongoose";
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

type RawSurveyAggregation = {
  _id: string;
  data: Array<{
    label: unknown;
    total: number;
  }>;
};

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

export async function getEventSurveyAnalytics(
  eventId: string,
): Promise<EventSurveyAnalyticsResult | null> {
  const event = await Event.findById(eventId).select("_id").lean();
  if (!event) {
    return null;
  }

  const rawAnalytics = await SurveyResponse.aggregate<RawSurveyAggregation>([
    { $match: { eventId: new Types.ObjectId(eventId) } },
    {
      $project: {
        answersArray: {
          $switch: {
            branches: [
              {
                case: { $eq: [{ $type: "$answers" }, "object"] },
                then: { $objectToArray: "$answers" },
              },
              {
                case: { $eq: [{ $type: "$answers" }, "array"] },
                then: {
                  $map: {
                    input: "$answers",
                    as: "answer",
                    in: {
                      k: {
                        $ifNull: [
                          "$$answer.label",
                          {
                            $ifNull: [
                              "$$answer.questionId",
                              "Pertanyaan Tanpa Judul",
                            ],
                          },
                        ],
                      },
                      v: "$$answer.value",
                    },
                  },
                },
              },
            ],
            default: [],
          },
        },
      },
    },
    { $unwind: { path: "$answersArray", preserveNullAndEmptyArrays: false } },
    {
      $match: {
        "answersArray.k": { $ne: null },
        "answersArray.v": { $ne: null },
      },
    },
    {
      $project: {
        question: "$answersArray.k",
        answerValues: {
          $cond: {
            if: { $eq: [{ $type: "$answersArray.v" }, "array"] },
            then: "$answersArray.v",
            else: ["$answersArray.v"],
          },
        },
      },
    },
    { $unwind: "$answerValues" },
    {
      $group: {
        _id: { question: "$question", answer: "$answerValues" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.question",
        data: {
          $push: {
            label: "$_id.answer",
            total: "$count",
          },
        },
      },
    },
  ]);

  const analytics: Record<string, SurveyAnalyticsItem> = {};

  rawAnalytics.forEach((item) => {
    const questionKey = item._id;
    const responses = item.data;

    const totalUniqueAnswers = responses.length;
    const totalVotes = responses.reduce((sum, entry) => sum + entry.total, 0);
    const avgFrequency =
      totalUniqueAnswers > 0 ? totalVotes / totalUniqueAnswers : 0;

    const isTextBased = totalUniqueAnswers >= 7 && avgFrequency <= 1.5;

    if (isTextBased) {
      analytics[questionKey] = {
        type: "text_list",
        data: responses.map((entry) => toAnswerLabel(entry.label)),
      };
      return;
    }

    const chartData: Record<string, number> = {};
    responses.forEach((entry) => {
      chartData[toAnswerLabel(entry.label)] = entry.total;
    });

    analytics[questionKey] = {
      type: "chart",
      data: chartData,
    };
  });

  return {
    eventId,
    totalDataAnalyzed: rawAnalytics.length,
    analytics,
  };
}
