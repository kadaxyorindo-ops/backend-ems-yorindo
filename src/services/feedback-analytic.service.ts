import FeedbackResponse from "../models/FeedbackResponse.ts";
import { Event } from "../models/index.ts";

type FeedbackRatingKey =
  | "overall"
  | "content"
  | "speaker"
  | "flow"
  | "venue"
  | "interest";

const RATING_KEYS: FeedbackRatingKey[] = [
  "overall",
  "content",
  "speaker",
  "flow",
  "venue",
  "interest",
];

type FeedbackAnalyticsComment = {
  id: string;
  comment: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  summary: string;
  submittedAt: Date | null;
};

export interface EventFeedbackAnalyticsResult {
  eventId: string;
  totalResponses: number;
  commentCount: number;
  averageRatings: Record<FeedbackRatingKey, number>;
  willJoinFuture: {
    yes: number;
    no: number;
  };
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  recentComments: FeedbackAnalyticsComment[];
}

export async function getEventFeedbackAnalytics(
  eventId: string,
): Promise<EventFeedbackAnalyticsResult | null> {
  const event = await Event.findById(eventId).select("_id").lean();
  if (!event) {
    return null;
  }

  const feedbackRows = await FeedbackResponse.find({ eventId })
    .select("ratings willJoinFuture comment aiAnalysis submittedAt createdAt")
    .sort({ submittedAt: -1, createdAt: -1 })
    .lean<
      Array<{
        _id: unknown;
        ratings?: Partial<Record<FeedbackRatingKey, number>>;
        willJoinFuture?: boolean;
        comment?: string;
        aiAnalysis?: {
          sentiment?: "Positive" | "Neutral" | "Negative";
          score?: number;
          summary?: string;
        };
        submittedAt?: Date | null;
        createdAt?: Date | null;
      }>
    >();

  const totalResponses = feedbackRows.length;

  const ratingTotals = RATING_KEYS.reduce(
    (accumulator, key) => ({
      ...accumulator,
      [key]: 0,
    }),
    {} as Record<FeedbackRatingKey, number>,
  );

  let joinYes = 0;
  let joinNo = 0;
  let commentCount = 0;
  let positive = 0;
  let neutral = 0;
  let negative = 0;

  const recentComments: FeedbackAnalyticsComment[] = [];

  feedbackRows.forEach((row) => {
    RATING_KEYS.forEach((key) => {
      ratingTotals[key] += Number(row.ratings?.[key] ?? 0);
    });

    if (row.willJoinFuture) {
      joinYes += 1;
    } else {
      joinNo += 1;
    }

    const rawComment =
      typeof row.comment === "string" ? row.comment.trim() : "";

    const sentiment = row.aiAnalysis?.sentiment ?? "Neutral";
    if (sentiment === "Positive") positive += 1;
    else if (sentiment === "Negative") negative += 1;
    else neutral += 1;

    if (rawComment) {
      commentCount += 1;
      recentComments.push({
        id: String(row._id),
        comment: rawComment,
        sentiment,
        summary:
          typeof row.aiAnalysis?.summary === "string"
            ? row.aiAnalysis.summary
            : "",
        submittedAt: row.submittedAt ?? row.createdAt ?? null,
      });
    }
  });

  const averageRatings = RATING_KEYS.reduce(
    (accumulator, key) => ({
      ...accumulator,
      [key]: totalResponses > 0 ? Number((ratingTotals[key] / totalResponses).toFixed(2)) : 0,
    }),
    {} as Record<FeedbackRatingKey, number>,
  );

  return {
    eventId,
    totalResponses,
    commentCount,
    averageRatings,
    willJoinFuture: {
      yes: joinYes,
      no: joinNo,
    },
    sentimentBreakdown: {
      positive,
      neutral,
      negative,
    },
    recentComments: recentComments.slice(0, 12),
  };
}
