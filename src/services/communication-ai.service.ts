/**
 * @file services/communication-ai.service.ts
 * @description AI-powered email content generation for communication campaigns.
 *
 * Yorindo Communication is a business development consultant & event organizer
 * that connects technology vendors with decision makers across industries
 * (Manufacturing, Healthcare, Finance, Government, Education, etc.) through
 * technology seminars across Indonesia.
 *
 * This service generates email broadcast content (subject, preview text, body)
 * in a single LLM call based on event context and optional admin instructions.
 */

import { Event } from "../models/schemas/event.schema";
import { Registration } from "../models/schemas/registration.schema";
import { chat } from "../utils/llmClient";

export interface GenerateEmailContentInput {
  eventId: string;
  /** Optional existing content for context — AI can refine/align with these. */
  currentSubject?: string | undefined;
  currentPreviewText?: string | undefined;
  currentBodyText?: string | undefined;
  templateId?: string | undefined;
  /** Custom instruction from admin to guide the AI generation. */
  customPrompt?: string | undefined;
}

export interface GenerateEmailContentResult {
  subject: string;
  previewText: string;
  bodyHtml: string;
}

const TEMPLATE_TONE_MAP: Record<string, string> = {
  executive_brief:
    "Formal and professional. Suitable for operational updates, official invitations to Director/Manager level. " +
    "Use concise, straightforward language with a business tone.",
  event_spotlight:
    "Warm and persuasive. Suitable for campaign announcements, seminar invitations with an engaging call to action. " +
    "Can be more expressive and use inviting language.",
  minimal_notice:
    "Short and to-the-point. Suitable for brief notifications, reminders, or informational blasts. " +
    "No pleasantries needed, get straight to the point.",
};

function buildEventContext(event: {
  title: string;
  description?: string | null;
  category?: string | null;
  industry?: { name?: string | null } | null;
  eventDate: Date;
  location?: string | null;
  status: string;
}): string {
  const parts = [
    `Event Name: ${event.title}`,
    event.description ? `Description: ${event.description}` : null,
    event.category ? `Category: ${event.category}` : null,
    event.industry?.name ? `Target Industry: ${event.industry.name}` : null,
    `Date: ${event.eventDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
    event.location ? `Location: ${event.location}` : null,
    `Event Status: ${event.status}`,
  ];
  return parts.filter(Boolean).join("\n");
}

function buildAudienceContext(stats: {
  totalRecipients: number;
  topIndustries: string[];
  topJobTitles: string[];
}): string {
  const parts: string[] = [];
  if (stats.totalRecipients > 0) {
    parts.push(`Number of recipients: ${stats.totalRecipients}`);
  }
  if (stats.topIndustries.length > 0) {
    parts.push(`Recipient industries: ${stats.topIndustries.join(", ")}`);
  }
  if (stats.topJobTitles.length > 0) {
    parts.push(`Recipient job titles: ${stats.topJobTitles.join(", ")}`);
  }
  return parts.length > 0
    ? `\nAudience Profile:\n${parts.join("\n")}`
    : "";
}

const SYSTEM_PROMPT =
  "You are a professional email copywriter working for Yorindo Communication, " +
  "an event organizer and business development consultant that hosts " +
  "technology seminars connecting IT vendors with decision makers across industries " +
  "(Manufacturing, Healthcare, Banking, Government, Education, etc.) throughout Indonesia. " +
  "Your email audience consists of professionals: Directors, IT Managers, Engineers, HR, Risk Managers, " +
  "and other strategic positions. Use professional English. " +
  "Follow the format instructions strictly. Reply ONLY in the requested JSON format.";

function buildPrompt(
  eventContext: string,
  audienceContext: string,
  input: GenerateEmailContentInput,
): string {
  const existingContext: string[] = [];
  if (input.currentSubject) {
    existingContext.push(`Current subject: "${input.currentSubject}"`);
  }
  if (input.currentPreviewText) {
    existingContext.push(`Current preview text: "${input.currentPreviewText}"`);
  }
  if (input.currentBodyText) {
    existingContext.push(`Current email body: "${input.currentBodyText}"`);
  }

  const existingSection =
    existingContext.length > 0
      ? `\nExisting email content written by admin:\n${existingContext.join("\n")}`
      : "";

  const toneGuide = input.templateId
    ? TEMPLATE_TONE_MAP[input.templateId] ?? ""
    : "";
  const toneSection = toneGuide
    ? `\nTone & Style: ${toneGuide}`
    : "";

  const customSection = input.customPrompt?.trim()
    ? `\nAdditional instructions from admin:\n"${input.customPrompt.trim()}"\nEnsure the generated result follows the above instructions as closely as possible.`
    : "";

  const contextBlock =
    `Event Context:\n${eventContext}` +
    audienceContext +
    toneSection +
    (existingSection ? `\n${existingSection}` : "") +
    customSection;

  return (
    `Create complete email broadcast content (subject, preview text, and body) for the following event.\n\n` +
    `${contextBlock}\n\n` +
    `REPLY in valid JSON format (without markdown code block) with this structure:\n` +
    `{"subject":"...","previewText":"...","bodyHtml":"..."}\n\n` +
    `Rules for "subject":\n` +
    `- Maximum 80 characters\n` +
    `- Attention-grabbing for Manager/Director level professionals\n` +
    `- Mention the event name or main topic directly\n` +
    `- Do not use spam words ("FREE", "PROMO") or emojis\n\n` +
    `Rules for "previewText":\n` +
    `- Maximum 140 characters\n` +
    `- Complement the subject, do not repeat it\n` +
    `- Mention interesting details: date, location, or benefits\n\n` +
    `Rules for "bodyHtml":\n` +
    `- Simple HTML format (only <p>, <strong>, <em>, <ul>, <li>)\n` +
    `- REQUIRED placeholders in body (will be replaced with actual data when sent):\n` +
    `  {{recipientName}}  → recipient's full name\n` +
    `  {{eventTitle}}     → event title\n` +
    `  {{eventDate}}      → event date\n` +
    `  {{eventLocation}}  → event venue/location\n` +
    `  {{eventIndustry}}  → target industry of the event\n` +
    `- Body structure:\n` +
    `  1. Greeting: "Dear {{recipientName}}," or "Hello {{recipientName}},"\n` +
    `  2. Introduction: value/benefits of the event for the recipient\n` +
    `  3. Details: use placeholders {{eventTitle}}, {{eventDate}}, {{eventLocation}}\n` +
    `  4. Clear call-to-action\n` +
    `  5. Closing on behalf of Yorindo Communication\n` +
    `- 3-5 paragraphs, not too long\n\n` +
    `IMPORTANT: subject and previewText MUST NOT use placeholders — write the final text directly.\n` +
    `bodyHtml MUST use placeholders for dynamic data.`
  );
}

function safeParse(content: string): GenerateEmailContentResult | null {
  try {
    // Strip markdown code block if LLM wraps it
    const cleaned = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const subject = typeof parsed.subject === "string" ? parsed.subject.trim() : "";
    const previewText = typeof parsed.previewText === "string" ? parsed.previewText.trim() : "";
    const bodyHtml = typeof parsed.bodyHtml === "string" ? parsed.bodyHtml.trim() : "";

    if (!subject && !previewText && !bodyHtml) {
      return null;
    }

    return { subject, previewText, bodyHtml };
  } catch {
    return null;
  }
}

async function getAudienceStats(
  eventId: string,
): Promise<{ totalRecipients: number; topIndustries: string[]; topJobTitles: string[] }> {
  try {
    const registrations = await Registration.find({
      eventId,
      status: { $in: ["approved", "checked_in", "pending"] },
    })
      .select("industrySnapshot jobTitleSnapshot")
      .lean();

    const industryCounts = new Map<string, number>();
    const jobTitleCounts = new Map<string, number>();

    for (const reg of registrations) {
      const industryName = reg.industrySnapshot?.name ?? null;
      if (industryName) {
        industryCounts.set(
          industryName,
          (industryCounts.get(industryName) ?? 0) + 1,
        );
      }

      const jobTitleName = reg.jobTitleSnapshot?.name ?? null;
      if (jobTitleName) {
        jobTitleCounts.set(
          jobTitleName,
          (jobTitleCounts.get(jobTitleName) ?? 0) + 1,
        );
      }
    }

    const topIndustries = [...industryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    const topJobTitles = [...jobTitleCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    return {
      totalRecipients: registrations.length,
      topIndustries,
      topJobTitles,
    };
  } catch {
    return { totalRecipients: 0, topIndustries: [], topJobTitles: [] };
  }
}

export async function generateEmailContent(
  input: GenerateEmailContentInput,
): Promise<GenerateEmailContentResult> {
  const event = await Event.findById(input.eventId)
    .select("title description category industry eventDate location status")
    .lean();

  if (!event) {
    throw new Error("Event not found.");
  }

  const audienceStats = await getAudienceStats(input.eventId);
  const eventContext = buildEventContext(event);
  const audienceContext = buildAudienceContext(audienceStats);
  const prompt = buildPrompt(eventContext, audienceContext, input);

  const content = await chat([
    {
      role: "developer",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: prompt,
    },
  ]);

  const result = safeParse(content);

  if (!result) {
    throw new Error("Failed to process AI result. Please try again.");
  }

  return result;
}
