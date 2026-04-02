import type { FieldType } from "../../models/constants/enums.ts";
import type { IRegistrationField } from "../../models/schemas/sub/registration-field.schema.ts";

export interface FormBuilderOptionInput {
  value: string;
  label?: string;
  isDefault?: boolean;
}

export interface FormBuilderFieldInput {
  fieldId?: string;
  key: string;
  label: string;
  type:
    | FieldType
    | "radio_button"
    | "dropdown"
    | "long_question"
    | "short_text"
    | "phone_number";
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

export interface FormBuilderEventInfo {
  id: string;
  title: string;
  eventDate: Date;
  location: string | null;
  status: string;
  slug?: string;
}

export interface FormBuilderView {
  event: FormBuilderEventInfo;
  eventId: string;
  version: number;
  publishedAt: Date | null;
  fixedFields: IRegistrationField[];
  customQuestions: IRegistrationField[];
}
/**
 * @file types/api/index.ts
 * @description Shared TypeScript types for all API responses.
 *
 * Every endpoint returns either ApiSuccessResponse or ApiErrorResponse.
 * Pagination is embedded inside ApiSuccessResponse when the data is a list.
 */

/** Metadata for paginated list responses. */
export interface Pagination {
  page: number;
  limit: number;
  total: number; // Total douments matching the filter
  totalPages: number;
}

/** Wrapper returned by list endpoints that support pagination. */
export interface PaginatedData<T> {
  items: T[];
  pagination: Pagination;
}

/** Shape of every successful response body */
export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

/** Shape of every error response body */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: unknown; // Zod field errors, or any structured details
}
