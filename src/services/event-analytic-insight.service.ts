/**
 * @file services/event-analytic-insight.service.ts
 * @description AI-generated insights for event analytics.
 */

import { getEventAnalyticsOverview } from "./event-analytic.service.ts";
import { chat } from "../utils/llmClient.ts";

export interface EventAnalyticsInsight {
  summary: string;
  highlights: string[];
  recommendations: string[];
}

function buildPrompt(overview: unknown): string {
  return `Berikut data analytics event (JSON). Buat insight singkat dalam Bahasa Indonesia.\n` +
    `BALAS HANYA JSON valid dengan format:\n` +
    `{"summary":"...","highlights":["..."],"recommendations":["..."]}\n` +
    `- summary maksimal 2 kalimat.\n` +
    `- highlights maksimal 3 poin.\n` +
    `- recommendations maksimal 3 poin.\n` +
    `Data: ${JSON.stringify(overview)}`;
}

function safeParse(content: string): EventAnalyticsInsight {
  try {
    const parsed = JSON.parse(content) as EventAnalyticsInsight;
    return {
      summary: parsed.summary ?? "",
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [],
    };
  } catch {
    return {
      summary: content.trim(),
      highlights: [],
      recommendations: [],
    };
  }
}

export async function getEventAnalyticsInsights(
  eventId: string,
  month?: string,
): Promise<EventAnalyticsInsight | null> {
  const overview = await getEventAnalyticsOverview(eventId, month);
  if (!overview) return null;

  const content = await chat([
    {
      role: "developer",
      content:
        "Kamu analis data yang ringkas. Ikuti instruksi format JSON dengan ketat.",
    },
    {
      role: "user",
      content: buildPrompt(overview),
    },
  ]);

  return safeParse(String(content));
}
