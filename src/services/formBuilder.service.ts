import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { Event, Industry } from "../models/index.ts";
import { STATUS } from "../models/constants/enums.ts";
import type { FieldType } from "../models/constants/enums.ts";
import type { IRegistrationField } from "../models/schemas/sub/registration-field.schema.ts";
import type { IOption } from "../models/schemas/sub/option.schema.ts";
import type {
  FormBuilderFieldInput,
  FormBuilderOptionInput,
  FormBuilderUpsertRequest,
  FormBuilderFieldView,
  FormBuilderView,
} from "../types/api/index.ts";

export class FormBuilderValidationError extends Error {
  statusCode = 400;
}

const DEFAULT_FIXED_FIELDS: FormBuilderFieldInput[] = [
  { key: "full_name", label: "Nama Lengkap", type: "text", required: true },
  {
    key: "company_name",
    label: "Company Name",
    type: "text",
    required: true,
  },
  {
    key: "company_location",
    label: "Company Location",
    type: "text",
    required: true,
  },
  { key: "industry", label: "Industry", type: "select", required: true },
  { key: "job_title", label: "Job Title", type: "text", required: true },
  {
    key: "company_email",
    label: "Company Email",
    type: "email",
    required: true,
  },
  {
    key: "personal_email",
    label: "Personal Email",
    type: "email",
    required: true,
  },
  { key: "phone", label: "Nomor Handphone", type: "phone", required: true },
];

const TYPE_ALIASES: Record<string, FieldType> = {
  radio_button: "radio",
  dropdown: "select",
  long_question: "textarea",
  short_text: "text",
  phone_number: "phone",
};

const OPTION_TYPES: FieldType[] = ["radio", "checkbox", "select"];

function normalizeType(input: string): FieldType | null {
  if (STATUS.FIELD_TYPE.includes(input as FieldType)) {
    return input as FieldType;
  }
  return TYPE_ALIASES[input] ?? null;
}

function normalizeOptions(
  options?: Array<string | FormBuilderOptionInput>,
): IOption[] | undefined {
  if (!options || options.length === 0) return undefined;

  return options.map((option) => {
    if (typeof option === "string") {
      return {
        value: option,
        label: option,
        isDefault: false,
      };
    }

    return {
      value: option.value,
      label: option.label ?? option.value,
      isDefault: option.isDefault ?? false,
    };
  });
}

function ensure(condition: boolean, message: string): void {
  if (!condition) {
    throw new FormBuilderValidationError(message);
  }
}

function buildField(
  input: FormBuilderFieldInput,
  isFixed: boolean,
  order: number,
): IRegistrationField {
  const type = normalizeType(input.type);
  ensure(Boolean(type), `Unknown field type: ${input.type}`);

  const options = normalizeOptions(input.options);

  if (type && OPTION_TYPES.includes(type)) {
    ensure(
      Boolean(options && options.length > 0),
      "Options are required for choice fields",
    );
  }

  return {
    fieldId: input.fieldId ?? randomUUID(),
    key: input.key,
    label: input.label,
    type: type as FieldType,
    order,
    isFixed,
    ...(input.placeholder === undefined
      ? {}
      : { placeholder: input.placeholder }),
    ...(input.helpText === undefined ? {} : { helpText: input.helpText }),
    ...(options === undefined ? {} : { options }),
    validation: {
      required: input.required ?? false,
    },
    isActive: input.isActive ?? true,
  };
}

function mapFieldForView(field: IRegistrationField): FormBuilderFieldView {
  if (!field.options || field.key !== "industry") {
    return field;
  }

  const options = field.options.map((option) => option.value);
  return { ...field, options };
}

function mapFieldsForView(
  fields: IRegistrationField[],
): FormBuilderFieldView[] {
  return fields.map((field) => mapFieldForView(field));
}

async function fetchIndustryOptionValues(
  requireNonEmpty: boolean,
): Promise<string[]> {
  const industries = await Industry.find()
    .sort({ name: 1 })
    .lean<{ name?: string | null }[]>();

  const values = industries
    .map((industry) => industry.name?.trim())
    .filter((name): name is string => Boolean(name));

  if (requireNonEmpty) {
    ensure(values.length > 0, "Industry options are not available");
  }

  return values;
}

function applyIndustryOptionsToFields(
  fields: IRegistrationField[],
  industryOptionValues: string[],
): IRegistrationField[] {
  const options = normalizeOptions(industryOptionValues);
  if (!options || options.length === 0) return fields;

  return fields.map((field) =>
    field.key === "industry" ? { ...field, options } : field,
  );
}

async function buildFixedFields(): Promise<FormBuilderFieldInput[]> {
  const industryOptions = await fetchIndustryOptionValues(true);

  return DEFAULT_FIXED_FIELDS.map((field) =>
    field.key === "industry" ? { ...field, options: industryOptions } : field,
  );
}

async function buildFields(
  payload: FormBuilderUpsertRequest,
): Promise<IRegistrationField[]> {
  const fixedFields = await buildFixedFields();
  const customQuestions = payload.customQuestions ?? [];

  const combined: Array<{ field: FormBuilderFieldInput; isFixed: boolean }> = [
    ...fixedFields.map((field) => ({ field, isFixed: true })),
    ...customQuestions.map((field) => ({ field, isFixed: false })),
  ];

  return combined.map((item, index) =>
    buildField(item.field, item.isFixed, index + 1),
  );
}

export async function upsertFormBuilder(
  eventId: string,
  payload: FormBuilderUpsertRequest,
): Promise<FormBuilderView | null> {
  const fields = await buildFields(payload);

  const event = await Event.findById(eventId);
  if (!event) return null;

  let formName = event.registrationForm?.name ?? null;
  if (payload.formName !== undefined) {
    ensure(typeof payload.formName === "string", "Form name must be a string");
    formName = payload.formName.trim();
    ensure(formName.length > 0, "Form name is required");
  }

  const currentVersion = event.registrationForm?.version ?? 1;
  const nextVersion = payload.publish ? currentVersion + 1 : currentVersion;
  const publishedAt = payload.publish
    ? new Date()
    : (event.registrationForm?.publishedAt ?? null);

  event.registrationForm = {
    name: formName,
    version: nextVersion,
    fields,
    publishedAt,
  };

  await event.save();

  return {
    event: {
      id: event.id,
      title: event.title,
      eventDate: event.eventDate,
      location: event.location ?? null,
      status: event.status,
      slug: event.slug,
    },
    eventId: event.id,
    formName: event.registrationForm.name ?? null,
    version: event.registrationForm.version,
    publishedAt: event.registrationForm.publishedAt,
    fixedFields: mapFieldsForView(fields.filter((field) => field.isFixed)),
    customQuestions: mapFieldsForView(fields.filter((field) => !field.isFixed)),
  };
}

export async function getFormBuilderByEvent(
  eventId: string,
): Promise<FormBuilderView | null> {
  const event = await Event.findById(eventId).lean();
  if (!event) return null;

  const fields = event.registrationForm?.fields ?? [];

  return {
    event: {
      id: event._id.toString(),
      title: event.title,
      eventDate: event.eventDate,
      location: event.location ?? null,
      status: event.status,
      slug: event.slug,
    },
    eventId: event._id.toString(),
    formName: event.registrationForm?.name ?? null,
    version: event.registrationForm?.version ?? 1,
    publishedAt: event.registrationForm?.publishedAt ?? null,
    fixedFields: mapFieldsForView(fields.filter((field) => field.isFixed)),
    customQuestions: mapFieldsForView(fields.filter((field) => !field.isFixed)),
  };
}

export async function getFormBuilderBySlug(
  slug: string,
): Promise<FormBuilderView | null> {
  const event = await Event.findOne({ slug }).lean();
  if (!event) return null;

  const rawFields = event.registrationForm?.fields ?? [];
  const industryOptionValues = await fetchIndustryOptionValues(false);
  const fields =
    industryOptionValues.length > 0
      ? applyIndustryOptionsToFields(rawFields, industryOptionValues)
      : rawFields;

  return {
    event: {
      id: event._id.toString(),
      title: event.title,
      eventDate: event.eventDate,
      location: event.location ?? null,
      status: event.status,
      slug: event.slug,
    },
    eventId: event._id.toString(),
    formName: event.registrationForm?.name ?? null,
    version: event.registrationForm?.version ?? 1,
    publishedAt: event.registrationForm?.publishedAt ?? null,
    fixedFields: mapFieldsForView(fields.filter((field) => field.isFixed)),
    customQuestions: mapFieldsForView(fields.filter((field) => !field.isFixed)),
  };
}

export async function getFormBuilderByIndustry(
  industryId: string,
): Promise<FormBuilderView | null> {
  const industryObjectId = new Types.ObjectId(industryId);

  const baseMatch = {
    "industry.refId": industryObjectId,
    "registrationForm.fields.0": { $exists: true },
  };

  const publishedEvent = await Event.findOne({
    ...baseMatch,
    "registrationForm.publishedAt": { $ne: null },
  })
    .sort({ "registrationForm.publishedAt": -1, updatedAt: -1 })
    .lean();

  const event =
    publishedEvent ??
    (await Event.findOne(baseMatch).sort({ updatedAt: -1 }).lean());

  if (!event) return null;

  const fields = event.registrationForm?.fields ?? [];

  return {
    event: {
      id: event._id.toString(),
      title: event.title,
      eventDate: event.eventDate,
      location: event.location ?? null,
      status: event.status,
      slug: event.slug,
    },
    eventId: event._id.toString(),
    formName: event.registrationForm?.name ?? null,
    version: event.registrationForm?.version ?? 1,
    publishedAt: event.registrationForm?.publishedAt ?? null,
    fixedFields: mapFieldsForView(fields.filter((field) => field.isFixed)),
    customQuestions: mapFieldsForView(fields.filter((field) => !field.isFixed)),
  };
}
