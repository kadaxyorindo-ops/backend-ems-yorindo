import type { Request, Response } from 'express';
import FeedbackResponse from '../models/FeedbackResponse';
import OpenAI from "openai";

/**
 * Initialize OpenAI Client 
 * These credentials should be defined in your .env file
 */
const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
});

/**
 * Service: Analyze sentiment and summarize feedback using AI
 * @param text The user's comment
 * @returns Object containing sentiment, score, and summary
 */
async function analyzeSentiment(text: string) {
  try {
    const response = await client.chat.completions.create({
      model: process.env.LLM_MODEL || "openai/gpt-5-nano",
      messages: [
        { 
          role: "system", 
          content: "You are a professional feedback analyzer. Output ONLY valid JSON: { \"sentiment\": \"Positive/Neutral/Negative\", \"score\": 0.0-1.0, \"summary\": \"max 10 words\" }" 
        },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" }, 
    });

    const content = response.choices?.[0]?.message?.content;
    return JSON.parse(content || "{}");

  } catch (error) {
    console.error("AI Analysis Service Error:", error);
    return null; // Return null so the controller can use default values
  }
}

/**
 * Controller: Handle post-event feedback submission
 * Route: POST /api/v1/feedback
 */
export async function handleSubmitFeedback(req: Request, res: Response): Promise<void> {
  try {
    // Extract data from request body
    // Using a fallback to handle both direct and wrapped payloads
    const payload = req.body.body || req.body;
    const { visitorId, eventId, ratings, willJoinFuture, comment } = payload;

    // 1. Validate required fields before processing
    if (!visitorId || !eventId || !ratings || !comment) {
      res.status(400).json({ 
        success: false, 
        message: "Validation Error: visitorId, eventId, ratings, and comment are required." 
      });
      return;
    }

    // 2. Perform AI Sentiment Analysis
    console.log(`Processing AI analysis for visitor: ${visitorId}`);
    const aiInsight = await analyzeSentiment(comment);

    // 3. Prepare data object for MongoDB
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

    // 4. Save feedback to the database
    const savedFeedback = await FeedbackResponse.create(feedbackData);

    // 5. Send successful response
    res.status(201).json({
      success: true,
      message: "Feedback submitted and analyzed successfully.",
      data: savedFeedback
    });

  } catch (error: any) {
    console.error("Feedback Controller Critical Error:", error);
    
    res.status(500).json({
      success: false,
      message: "Internal Server Error: Could not process feedback.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}