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
import { Event, SurveyResponse } from "../models/index.ts";
import type { IRegistrationField } from "../models/schemas/sub/registration-field.schema.ts";
import type { VisitorRegistrationBody } from "../validators/visitor.validators.ts";
import type { SurveyQuestionType } from "../models/constants/enums.ts";

interface CustomAnswerInput {
  fieldId?: string | undefined;
  label?: string | undefined;
  type?: string | undefined;
  value: unknown | undefined;
}

type CustomAnswerPayload = Array<CustomAnswerInput> | Record<string, unknown>;

const FIXED_FIELD_BODY_KEY_MAP: Record<string, string> = {
  full_name: "nama_lengkap",
  personal_email: "email_pribadi",
  company_email: "email_perusahaan",
  phone: "no_hp",
  company_name: "nama_company",
  company_location: "lokasi_perusahaan",
  industry: "jenis_industri",
  job_title: "jabatan",
};

function normalizeKey(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function inferAnswerType(
  field: IRegistrationField | null,
  value: unknown,
): SurveyQuestionType {
  if (field) {
    if (field.type === "textarea") return "textarea";
    if (field.type === "select") return "select";
    if (field.type === "radio") return "radio";
    if (field.type === "checkbox") return "checkbox";
  }

  if (Array.isArray(value)) return "checkbox";
  return "text";
}

function buildFieldMetaLookup(fields: IRegistrationField[]) {
  const byFieldId = new Map<string, IRegistrationField>();
  const byLabel = new Map<string, IRegistrationField>();
  const byKey = new Map<string, IRegistrationField>();

  for (const field of fields) {
    byFieldId.set(field.fieldId, field);
    byLabel.set(normalizeKey(field.label), field);
    byKey.set(normalizeKey(field.key), field);
  }

  return { byFieldId, byLabel, byKey };
}

function resolveField(
  rawKey: string,
  lookup: ReturnType<typeof buildFieldMetaLookup>,
): IRegistrationField | null {
  return (
    lookup.byFieldId.get(rawKey) ??
    lookup.byLabel.get(normalizeKey(rawKey)) ??
    lookup.byKey.get(normalizeKey(rawKey)) ??
    null
  );
}

function buildCustomAnswers(
  input: CustomAnswerPayload | null | undefined,
  fields: IRegistrationField[],
): Array<{
  questionId: string;
  label: string;
  type: SurveyQuestionType;
  value: unknown;
}> {
  if (!input) return [];

  const lookup = buildFieldMetaLookup(fields);
  const answers: Array<{
    questionId: string;
    label: string;
    type: SurveyQuestionType;
    value: unknown;
  }> = [];

  const assignAnswer = (rawKey: string, value: unknown): void => {
    const field = resolveField(rawKey, lookup);
    const questionId = field?.fieldId ?? rawKey;
    const label = field?.label ?? rawKey;
    const type = inferAnswerType(field, value);

    answers.push({
      questionId,
      label,
      type,
      value,
    });
  };

  if (Array.isArray(input)) {
    for (const item of input) {
      if (item.fieldId) {
        assignAnswer(item.fieldId, item.value);
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

function isFilledValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => isFilledValue(item));
  return true;
}

function buildRegistrationSnapshot(fields: IRegistrationField[] = []) {
  return fields.map((field) => ({
    fieldId: field.fieldId,
    key: field.key,
    label: field.label,
    type: field.type,
    order: field.order,
    isFixed: field.isFixed,
    ...(field.options ? { options: field.options } : {}),
  }));
}

function buildRegistrationAnswers(params: {
  fields: IRegistrationField[];
  bodyValues: Record<string, unknown>;
  customAnswers: Array<{
    questionId: string;
    label: string;
    type: SurveyQuestionType;
    value: unknown;
  }>;
}) {
  const customAnswerByFieldId = new Map(
    params.customAnswers.map((answer) => [answer.questionId, answer]),
  );

  return params.fields.flatMap((field) => {
    if (field.isFixed) {
      const bodyKey = FIXED_FIELD_BODY_KEY_MAP[field.key];
      const value = bodyKey ? params.bodyValues[bodyKey] : undefined;

      if (!isFilledValue(value)) {
        return [];
      }

      return [
        {
          fieldId: field.fieldId,
          key: field.key,
          label: field.label,
          type: field.type,
          value,
        },
      ];
    }

    const customAnswer = customAnswerByFieldId.get(field.fieldId);
    if (!customAnswer || !isFilledValue(customAnswer.value)) {
      return [];
    }

    return [
      {
        fieldId: field.fieldId,
        key: field.key,
        label: field.label,
        type: field.type,
        value: customAnswer.value,
      },
    ];
  });
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
  const registrationAnswers = buildRegistrationAnswers({
    fields: fields as IRegistrationField[],
    bodyValues: body as Record<string, unknown>,
    customAnswers: answers,
  });

  await Registration.findByIdAndUpdate(registration._id, {
    $set: {
      formSnapshot: {
        version: event.registrationForm?.version ?? 1,
        fields: buildRegistrationSnapshot(fields as IRegistrationField[]),
      },
      answers: registrationAnswers,
    },
  });

  if (answers.length > 0) {
    await SurveyResponse.findOneAndUpdate(
      {
        eventId: event_id,
        participantId: participant._id,
      },
      {
        $set: {
          surveyId: event.surveyId || null,
          registrationId: registration._id,
          answers,
          submittedAt: new Date(),
        },
        $setOnInsert: {
          eventId: event_id,
          participantId: participant._id,
        },
      },
      {
        upsert: true,
        new: true,
      },
    );
  }

  return {
    participant_id: participant._id,
    registration_id: registration._id,
  };
}
