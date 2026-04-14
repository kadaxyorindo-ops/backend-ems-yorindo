/**
 * @file services/survey-analytic-insight.service.ts
 * @description AI-generated insights for event survey responses.
 */

import { Event, SurveyResponse } from "../models/index";
import { chat } from "../utils/llmClient";

export class SurveyInsightUnavailableError extends Error {
  statusCode = 400;
}

export interface SurveyAnalyticsInsight {
  summary: string;
  keyFindings: string[];
  exhibitorActions: string[];
  opportunityWatchout: string;
}

export interface EventSurveyInsightResult {
  eventId: string;
  insight: SurveyAnalyticsInsight;
  totalResponses: number;
}

function buildPrompt(eventTitle: string, answers: unknown[]): string {
  return `
Analisis data survey pengunjung untuk event "${eventTitle}".

Fokus pada insight yang paling berguna untuk exhibitor.
Jangan mengulang data mentah atau menjelaskan struktur JSON.

BALAS HANYA JSON valid (tanpa Markdown) dengan format:
{"summary":"...","keyFindings":["..."],"exhibitorActions":["..."],"opportunityWatchout":"..."}
- summary maksimal 2 kalimat tentang pola utama audiens.
- keyFindings maksimal 3 poin: minat, kebutuhan, atau pain point paling menonjol.
- exhibitorActions maksimal 3 poin: rekomendasi spesifik dan praktis.
- opportunityWatchout 1 kalimat: peluang tersembunyi atau red flag.
Gunakan bahasa Indonesia profesional dan padat. Total jawaban idealnya di bawah 180 kata.

Data survey:
${JSON.stringify(answers)}
`.trim();
}

function safeParse(content: string): SurveyAnalyticsInsight {
  try {
    const parsed = JSON.parse(content) as Partial<SurveyAnalyticsInsight>;

    const summary = typeof parsed.summary === "string" ? parsed.summary : "";
    const keyFindings = Array.isArray(parsed.keyFindings)
      ? parsed.keyFindings.filter((item): item is string => typeof item === "string")
      : [];
    const exhibitorActions = Array.isArray(parsed.exhibitorActions)
      ? parsed.exhibitorActions.filter((item): item is string => typeof item === "string")
      : [];
    const opportunityWatchout =
      typeof parsed.opportunityWatchout === "string" ? parsed.opportunityWatchout : "";

    return {
      summary,
      keyFindings: keyFindings.slice(0, 3),
      exhibitorActions: exhibitorActions.slice(0, 3),
      opportunityWatchout,
    };
  } catch {
    const fallback = content.trim();
    return {
      summary: fallback,
      keyFindings: [],
      exhibitorActions: [],
      opportunityWatchout: "",
    };
  }
}

export async function getEventSurveyInsight(
  eventId: string,
): Promise<EventSurveyInsightResult | null> {
  const event = await Event.findById(eventId).select("title").lean();
  if (!event) {
    return null;
  }

  const rawResponses = await SurveyResponse.find({ eventId })
    .select("answers")
    .lean();

  if (rawResponses.length === 0) {
    throw new SurveyInsightUnavailableError(
      "Belum ada data survey untuk dianalisis oleh AI.",
    );
  }

  const cleanDataForAI = rawResponses.map((response) => response.answers);

  const insight = await chat([
    {
      role: "developer",
      content:
        "Kamu adalah analis bisnis event. Ikuti instruksi format JSON dengan ketat dan jangan gunakan Markdown.",
    },
    {
      role: "user",
      content: buildPrompt(event.title, cleanDataForAI),
    },
  ]);

  const parsedInsight = safeParse(String(insight));

  return {
    eventId,
    insight: parsedInsight,
    totalResponses: rawResponses.length,
  };
}
