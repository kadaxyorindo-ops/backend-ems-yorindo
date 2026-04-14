import type { Request, Response } from 'express';
import FeedbackResponse from '../models/FeedbackResponse';
import OpenAI from "openai";
import type { NextFunction } from "express";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";
import type { AnalyticsEventParams } from "../validators/analytic.validators.ts";
import { getEventFeedbackAnalytics } from "../services/feedback-analytic.service.ts";

/**
 * Controller: Handles post-event feedback submission
 * Orchestrates validation, AI analysis, and database persistence
 */
export async function handleSubmitFeedback(req: Request, res: Response): Promise<void> {
  try {
    // 1. Extract and sanitize payload
    const payload = req.body.body || req.body;
    const { visitorId, eventId, ratings, willJoinFuture, comment } = payload;

    // 2. Validate mandatory fields
    if (!visitorId || !eventId || !ratings || !comment) {
      res.status(400).json({ 
        success: false, 
        message: "Validation Error: Missing required fields." 
      });
      return;
    }

    // 3. Invoke the AI Service for analysis
    console.log(`[AI] Processing sentiment for visitor: ${visitorId}`);
    const aiInsight = await analyzeFeedbackSentiment(comment);

    // 4. Prepare and save data to MongoDB
    const feedbackData = {
      visitorId,
      eventId,
      ratings,
      willJoinFuture: Boolean(willJoinFuture),
      comment,
      aiAnalysis: {
        sentiment: aiInsight?.sentiment || 'Neutral',
        score: aiInsight?.score || 0,
        summary: aiInsight?.summary || 'No summary generated'
      }
    };

    const savedFeedback = await FeedbackResponse.create(feedbackData);

    // 5. Success Response
    res.status(201).json({
      success: true,
      message: "Feedback submitted and analyzed successfully.",
      data: savedFeedback
    });

  } catch (error: any) {
    console.error("Critical Feedback Controller Error:", error);
    
    res.status(500).json({
      success: false,
      message: "Internal Server Error: Could not process feedback.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export async function handleGetEventFeedbackAnalytics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as AnalyticsEventParams;
    const result = await getEventFeedbackAnalytics(eventId);

    if (!result) {
      sendError(res, 404, "Event tidak ditemukan");
      return;
    }

    sendSuccess(res, 200, "Feedback analytics berhasil dimuat", result);
  } catch (error) {
    next(error);
  }
}
