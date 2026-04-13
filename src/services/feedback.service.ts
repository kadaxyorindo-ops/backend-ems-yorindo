import OpenAI from "openai";

/**
 * AI Service Client configuration
 */
const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
});

/**
 * Service: Analyzes sentiment and generates a summary using LLM
 * @param text - The user's feedback comment
 * @returns Object containing sentiment, score, and summary
 */
export async function analyzeFeedbackSentiment(text: string) {
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
    // Return default values to ensure the app doesn't crash
    return {
      sentiment: 'Neutral',
      score: 0,
      summary: 'Analysis failed'
    };
  }
}