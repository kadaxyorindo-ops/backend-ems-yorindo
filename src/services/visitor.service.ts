/**
 * @file services/visitor.service.ts
 * @description Business logic for visitor registration.
 */

import City from "../models/City.ts";
import Company from "../models/Company.ts";
import Industry from "../models/Industry.ts";
import JobTitle from "../models/JobTitle.ts";
import Participant from "../models/Participant.ts";
import Registration from "../models/Registration.ts";
import SurveyResponse from "../models/SurveyResponse.ts";
import { Event } from "../models/index.ts";
import type { IRegistrationField } from "../models/schemas/sub/registration-field.schema.ts";
import type { VisitorRegistrationBody } from "../validators/visitor.validators.ts";

interface CustomAnswerInput {
  fieldId?: string | undefined;
  label?: string | undefined;
  type?: string | undefined;
  value: unknown | undefined;
}

type CustomAnswerPayload = Array<CustomAnswerInput> | Record<string, unknown>;

function normalizeKey(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function buildFieldLookup(fields: IRegistrationField[]) {
  const byFieldId = new Set<string>();
  const byLabel = new Map<string, string>();
  const byKey = new Map<string, string>();

  for (const field of fields) {
    if (field.fieldId) {
      byFieldId.add(field.fieldId);
    }
    if (field.label) {
      byLabel.set(normalizeKey(field.label), field.fieldId);
    }
    if (field.key) {
      byKey.set(normalizeKey(field.key), field.fieldId);
    }
  }

  return { byFieldId, byLabel, byKey };
}

function resolveFieldId(
  rawKey: string,
  lookup: ReturnType<typeof buildFieldLookup>,
): string | null {
  if (lookup.byFieldId.has(rawKey)) return rawKey;
  const normalized = normalizeKey(rawKey);
  return lookup.byLabel.get(normalized) ?? lookup.byKey.get(normalized) ?? null;
}

function buildCustomAnswers(
  input: CustomAnswerPayload | null | undefined,
  fields: IRegistrationField[],
): Record<string, unknown> {
  if (!input) return {};

  const lookup = buildFieldLookup(fields);
  const answers: Record<string, unknown> = {};

  const assignAnswer = (rawKey: string, value: unknown): void => {
    const resolved = resolveFieldId(rawKey, lookup);
    if (resolved) {
      answers[resolved] = value;
      return;
    }
    answers[rawKey] = value;
  };

  if (Array.isArray(input)) {
    for (const item of input) {
      if (item.fieldId) {
        answers[item.fieldId] = item.value;
        continue;
      }
      if (item.label) {
        assignAnswer(item.label, item.value);
      }
    }

    return answers;
  }

  for (const [key, value] of Object.entries(input)) {
    assignAnswer(key, value);
  }

  return answers;
}

export async function submitVisitorRegistration(
  body: VisitorRegistrationBody,
): Promise<{ participant_id: unknown; registration_id: unknown } | null> {
  const {
    event_id,
    nama_lengkap,
    email_pribadi,
    email_perusahaan,
    no_hp,
    nama_company,
    lokasi_perusahaan,
    jenis_industri,
    jabatan,
    survei_result,
  } = body;

  const event = await Event.findById(event_id).lean();
  if (!event) return null;

  const city = await City.findOneAndUpdate(
    { name: lokasi_perusahaan },
    {
      name: lokasi_perusahaan,
      normalizedName: lokasi_perusahaan.toLowerCase(),
    },
    { new: true, upsert: true },
  );

  const company = await Company.findOneAndUpdate(
    { name: nama_company },
    { name: nama_company, normalizedName: nama_company.toLowerCase() },
    { new: true, upsert: true },
  );

  const industry = await Industry.findOneAndUpdate(
    { name: jenis_industri },
    { name: jenis_industri, normalizedName: jenis_industri.toLowerCase() },
    { new: true, upsert: true },
  );

  const jobTitle = await JobTitle.findOneAndUpdate(
    { name: jabatan },
    { name: jabatan, normalizedName: jabatan.toLowerCase() },
    { new: true, upsert: true },
  );

  const participant = await Participant.findOneAndUpdate(
    { companyEmail: email_perusahaan },
    {
      fullName: nama_lengkap,
      normalizedFullName: nama_lengkap.toLowerCase(),
      personalEmail: email_pribadi,
      companyEmail: email_perusahaan,
      phone: no_hp,
      company: { companyId: company._id, name: company.name },
      industry: { refId: industry._id, name: industry.name },
      jobTitle: { refId: jobTitle._id, name: jobTitle.name },
      city: { refId: city._id, name: city.name },
    },
    { new: true, upsert: true },
  );

  const registration = await Registration.findOneAndUpdate(
    { eventId: event_id, participantId: participant._id },
    {
      $set: {
        companySnapshot: { companyId: company._id, name: company.name },
        industrySnapshot: { refId: industry._id, name: industry.name },
        jobTitleSnapshot: { refId: jobTitle._id, name: jobTitle.name },
        citySnapshot: { refId: city._id, name: city.name },
      },
      $setOnInsert: {
        eventId: event_id,
        participantId: participant._id,
        participantType: "participant",
        status: "pending",
      },
    },
    { new: true, upsert: true },
  );

  const fields = event.registrationForm?.fields ?? [];
  const answers = buildCustomAnswers(
    survei_result,
    fields as IRegistrationField[],
  );

  if (Object.keys(answers).length > 0) {
    const existingSurvey = await SurveyResponse.findOne({
      eventId: event_id,
      participantId: participant._id,
    });

    if (!existingSurvey) {
      const survey = new SurveyResponse({
        eventId: event_id,
        surveyId: event.surveyId || null,
        participantId: participant._id,
        registrationId: registration._id,
        answers,
      });

      await survey.save();
    }
  }

  return {
    participant_id: participant._id,
    registration_id: registration._id,
  };
}
