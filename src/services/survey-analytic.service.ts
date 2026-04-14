/**
 * @file services/survey-analytic.service.ts
 * @description Aggregation helpers for event survey analytics.
 */

import type { SurveyQuestionType } from "../models/constants/enums.ts";
import { Event, Registration, SurveyResponse } from "../models/index.ts";
import type { IRegistrationField } from "../models/schemas/sub/registration-field.schema.ts";

export interface SurveyAnalyticsItem {
  type: "chart" | "text_list";
  data: Record<string, number> | string[];
}

export interface EventSurveyAnalyticsResult {
  eventId: string;
  totalResponses: number;
  totalDataAnalyzed: number;
  analytics: Record<string, SurveyAnalyticsItem>;
  diagnostics: {
    registrationCount: number;
    surveyResponseCount: number;
    registrationsWithStoredAnswers: number;
    surveyResponsesWithAnswers: number;
    customFieldCount: number;
    sourceBreakdown: {
      surveyResponses: number;
      registrations: number;
    };
  };
}

export type RawSurveyAnswerRow = {
  questionId: string;
  label: unknown;
  type: unknown;
  value: unknown;
};

type SupportedAnalyticsType = "text_list" | "chart";

type RegistrationSnapshotField = Pick<
  IRegistrationField,
  "fieldId" | "key" | "label" | "type" | "isFixed"
>;

type SurveyAnswerSource = {
  participantId: string;
  answers: RawSurveyAnswerRow[];
};

type AggregatedQuestion = {
  questionId: string;
  label: string;
  type: SupportedAnalyticsType;
  responses: string[];
  counts: Record<string, number>;
};

const TEXT_TYPES = new Set<string>([
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "date",
  "file",
]);
const CHART_TYPES = new Set<string>(["select", "radio", "checkbox", "rating"]);

function normalizeKey(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

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

function normalizeRawType(type: unknown): string {
  if (typeof type !== "string") {
    return "";
  }

  const normalized = type.trim().toLowerCase();

  const aliases: Record<string, string> = {
    radio_button: "radio",
    dropdown: "select",
    long_question: "textarea",
    short_text: "text",
    multiple_choice: "checkbox",
    single_choice: "radio",
  };

  return aliases[normalized] ?? normalized;
}

function inferAnalyticsTypeFromValue(value: unknown): SupportedAnalyticsType {
  return Array.isArray(value) ? "chart" : "text_list";
}

function toSupportedAnalyticsType(
  type: unknown,
  value?: unknown,
): SupportedAnalyticsType | null {
  const normalizedType = normalizeRawType(type);

  if (TEXT_TYPES.has(normalizedType)) {
    return "text_list";
  }

  if (CHART_TYPES.has(normalizedType)) {
    return "chart";
  }

  if (value !== undefined) {
    return inferAnalyticsTypeFromValue(value);
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

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toAnswerRowFromStructured(
  item: unknown,
  fields: IRegistrationField[],
): RawSurveyAnswerRow | null {
  if (!isObjectLike(item)) return null;

  const questionId =
    typeof item.questionId === "string"
      ? item.questionId.trim()
      : typeof item.fieldId === "string"
        ? item.fieldId.trim()
        : "";
  if (!questionId) return null;

  const lookup = buildFieldLookup(fields);
  const field =
    lookup.byFieldId.get(questionId) ??
    (typeof item.key === "string"
      ? resolveFieldMeta(item.key, lookup)
      : null) ??
    (typeof item.label === "string"
      ? resolveFieldMeta(item.label, lookup)
      : null);

  const value = "value" in item ? item.value : undefined;

  return {
    questionId: field?.fieldId ?? questionId,
    label: field?.label ?? item.label,
    type: field?.type ?? item.type,
    value,
  };
}

function buildFieldLookup(fields: IRegistrationField[]) {
  const byFieldId = new Map<string, IRegistrationField>();
  const byKey = new Map<string, IRegistrationField>();
  const byLabel = new Map<string, IRegistrationField>();

  for (const field of fields) {
    byFieldId.set(field.fieldId, field);
    byKey.set(normalizeKey(field.key), field);
    byLabel.set(normalizeKey(field.label), field);
  }

  return { byFieldId, byKey, byLabel };
}

function resolveFieldMeta(
  rawKey: string,
  lookup: ReturnType<typeof buildFieldLookup>,
): IRegistrationField | null {
  return (
    lookup.byFieldId.get(rawKey) ??
    lookup.byKey.get(normalizeKey(rawKey)) ??
    lookup.byLabel.get(normalizeKey(rawKey)) ??
    null
  );
}

function inferLegacyAnswerType(value: unknown): SurveyQuestionType {
  if (Array.isArray(value)) return "checkbox";
  return "text";
}

function isMeaningfulAnswerValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value))
    return value.some((item) => isMeaningfulAnswerValue(item));
  return true;
}

function mapStructuredRegistrationAnswers(
  answers: unknown,
  snapshotFields: RegistrationSnapshotField[],
): RawSurveyAnswerRow[] {
  if (!Array.isArray(answers)) {
    return [];
  }

  const fieldLookup = new Map(
    snapshotFields.map((field) => [field.fieldId, field]),
  );

  return answers
    .map((item) => {
      if (!isObjectLike(item)) return null;

      const fieldId =
        typeof item.fieldId === "string"
          ? item.fieldId.trim()
          : typeof item.questionId === "string"
            ? item.questionId.trim()
            : "";

      if (!fieldId) return null;

      const field = fieldLookup.get(fieldId);
      if (field?.isFixed) return null;

      const value = "value" in item ? item.value : undefined;
      if (!isMeaningfulAnswerValue(value)) return null;

      return {
        questionId: fieldId,
        label: field?.label ?? item.label,
        type: field?.type ?? item.type,
        value,
      } satisfies RawSurveyAnswerRow;
    })
    .filter((item): item is RawSurveyAnswerRow => Boolean(item));
}

function normalizeRegistrationAnswers(
  answers: unknown,
  snapshotFields: RegistrationSnapshotField[],
  eventFields: IRegistrationField[],
): RawSurveyAnswerRow[] {
  const structuredAnswers = mapStructuredRegistrationAnswers(
    answers,
    snapshotFields,
  );
  if (structuredAnswers.length > 0) {
    return structuredAnswers;
  }

  const fallbackLookup = new Map(
    eventFields
      .filter((field) => !field.isFixed)
      .map(
        (field) =>
          [field.fieldId, field] satisfies [string, IRegistrationField],
      ),
  );

  return normalizeSurveyResponseAnswers(answers, eventFields).filter(
    (answer) => {
      const field = fallbackLookup.get(String(answer.questionId).trim());
      return Boolean(field && isMeaningfulAnswerValue(answer.value));
    },
  );
}

export async function getEventSurveyAnswerSources(eventId: string): Promise<{
  sources: SurveyAnswerSource[];
  diagnostics: EventSurveyAnalyticsResult["diagnostics"];
} | null> {
  const event = await Event.findById(eventId)
    .select("_id registrationForm.fields")
    .lean();
  if (!event) {
    return null;
  }

  const eventFields = (event.registrationForm?.fields ??
    []) as IRegistrationField[];

  const [surveyResponses, registrations] = await Promise.all([
    SurveyResponse.find({ eventId }).select("participantId answers").lean(),
    Registration.find({ eventId, "answers.0": { $exists: true } })
      .select("participantId answers formSnapshot.fields")
      .lean(),
  ]);

  const registrationByParticipant = new Map(
    registrations.map((registration) => [
      String(registration.participantId),
      {
        answers: normalizeRegistrationAnswers(
          registration.answers,
          (registration.formSnapshot?.fields ??
            []) as RegistrationSnapshotField[],
          eventFields,
        ),
      },
    ]),
  );

  const chosenSources: SurveyAnswerSource[] = [];
  const coveredParticipants = new Set<string>();
  let surveyResponseSourceCount = 0;
  let registrationSourceCount = 0;

  const registrationsWithStoredAnswers = registrations.filter(
    (registration) =>
      Array.isArray(registration.answers) && registration.answers.length > 0,
  ).length;
  const surveyResponsesWithAnswers = surveyResponses.filter((response) => {
    if (Array.isArray(response.answers)) return response.answers.length > 0;
    return (
      isObjectLike(response.answers) && Object.keys(response.answers).length > 0
    );
  }).length;

  surveyResponses.forEach((response) => {
    const participantId = String(response.participantId);
    const answers = normalizeSurveyResponseAnswers(
      response.answers,
      eventFields,
    ).filter((answer) => isMeaningfulAnswerValue(answer.value));

    if (answers.length > 0) {
      chosenSources.push({ participantId, answers });
      coveredParticipants.add(participantId);
      surveyResponseSourceCount += 1;
      return;
    }

    const registrationFallback = registrationByParticipant.get(participantId);
    if (registrationFallback && registrationFallback.answers.length > 0) {
      chosenSources.push({
        participantId,
        answers: registrationFallback.answers,
      });
      coveredParticipants.add(participantId);
      registrationSourceCount += 1;
    }
  });

  registrationByParticipant.forEach((registration, participantId) => {
    if (coveredParticipants.has(participantId)) {
      return;
    }

    if (registration.answers.length > 0) {
      chosenSources.push({
        participantId,
        answers: registration.answers,
      });
      registrationSourceCount += 1;
    }
  });

  return {
    sources: chosenSources,
    diagnostics: {
      registrationCount: registrations.length,
      surveyResponseCount: surveyResponses.length,
      registrationsWithStoredAnswers,
      surveyResponsesWithAnswers,
      customFieldCount: eventFields.filter((field) => !field.isFixed).length,
      sourceBreakdown: {
        surveyResponses: surveyResponseSourceCount,
        registrations: registrationSourceCount,
      },
    },
  };
}

export function normalizeSurveyResponseAnswers(
  answers: unknown,
  fields: IRegistrationField[],
): RawSurveyAnswerRow[] {
  if (!answers) return [];

  if (Array.isArray(answers)) {
    return answers
      .map((item) => toAnswerRowFromStructured(item, fields))
      .filter((item): item is RawSurveyAnswerRow => Boolean(item));
  }

  if (!isObjectLike(answers)) {
    return [];
  }

  const lookup = buildFieldLookup(fields);

  return Object.entries(answers).map(([rawKey, value]) => {
    const field = resolveFieldMeta(rawKey, lookup);

    return {
      questionId: field?.fieldId ?? rawKey,
      label: field?.label ?? rawKey,
      type: field?.type ?? inferLegacyAnswerType(value),
      value,
    };
  });
}

export async function getEventSurveyAnalytics(
  eventId: string,
): Promise<EventSurveyAnalyticsResult | null> {
  const sourceResult = await getEventSurveyAnswerSources(eventId);
  if (!sourceResult) {
    return null;
  }

  const rawAnswers = sourceResult.sources.flatMap((source) => source.answers);

  const groupedQuestions = new Map<string, AggregatedQuestion>();

  rawAnswers.forEach((answer) => {
    const analyticsType = toSupportedAnalyticsType(answer.type, answer.value);
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
    } else if (
      question.label === fallbackLabel &&
      questionLabel !== fallbackLabel
    ) {
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
    totalResponses: sourceResult.sources.length,
    totalDataAnalyzed: groupedQuestions.size,
    analytics,
    diagnostics: sourceResult.diagnostics,
  };
}
