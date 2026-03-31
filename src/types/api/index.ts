import type { EventStatus, FieldType } from "../../models/constants/enums.ts";
import type { IRegistrationField } from "../../models/schemas/sub/registration-field.schema.ts";

export interface EventCreateRequest {
  eventId?: string;
  createdBy: string;
  slug?: string;
  title: string;
  description?: string | null;
  eventDate: string | Date;
  location?: string | null;
  status?: EventStatus;
  maxCapacity?: number | null;
}

export interface FormBuilderOptionInput {
  value: string;
  label?: string;
  isDefault?: boolean;
}

export interface FormBuilderFieldInput {
  fieldId?: string;
  key: string;
  label: string;
  type: FieldType | "radio_button" | "dropdown" | "long_question" | "short_text" | "phone_number";
  placeholder?: string;
  helpText?: string;
  options?: Array<string | FormBuilderOptionInput>;
  required?: boolean;
  isActive?: boolean;
}

export interface FormBuilderUpsertRequest {
  fixedFields?: FormBuilderFieldInput[];
  customQuestions?: FormBuilderFieldInput[];
  publish?: boolean;
}

export interface FormBuilderView {
  eventId: string;
  version: number;
  publishedAt: Date | null;
  fixedFields: IRegistrationField[];
  customQuestions: IRegistrationField[];
}
