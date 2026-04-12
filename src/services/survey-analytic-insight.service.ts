/**
 * @file services/survey-analytic-insight.service.ts
 * @description AI-generated insights for event survey responses.
 */

import { Event, SurveyResponse } from "../models/index.ts";
import { chat } from "../utils/llmClient.ts";

export class SurveyInsightUnavailableError extends Error {
  statusCode = 400;
}

export interface EventSurveyInsightResult {
  eventId: string;
  insight: string;
  totalResponses: number;
}

function buildPrompt(eventTitle: string, answers: unknown[]): string {
  return `
Analisis data survey pengunjung untuk event "${eventTitle}".

Fokus pada insight yang paling berguna untuk exhibitor.
Jangan mengulang data mentah atau menjelaskan struktur JSON.

Balas dalam Markdown singkat dengan format:

### Ringkasan
(maksimal 2 kalimat tentang pola utama audiens)

### Temuan Utama
- maksimal 3 poin
- sorot minat, kebutuhan, atau pain point yang paling menonjol

### Aksi untuk Exhibitor
- maksimal 3 poin
- rekomendasi harus spesifik, praktis, dan bisa langsung ditindaklanjuti

### Peluang / Waspada
(1 poin singkat tentang peluang tersembunyi atau red flag)

Gunakan bahasa Indonesia profesional dan padat. Total jawaban singkat, idealnya di bawah 180 kata.

Data survey:
${JSON.stringify(answers)}
`.trim();
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
        "Kamu adalah analis bisnis event. Tulis insight yang singkat, tajam, dan mudah dibaca exhibitor.",
    },
    {
      role: "user",
      content: buildPrompt(event.title, cleanDataForAI),
    },
  ]);

  return {
    eventId,
    insight: String(insight).trim(),
    totalResponses: rawResponses.length,
  };
}
