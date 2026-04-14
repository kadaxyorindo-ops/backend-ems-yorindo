/**
 * @file validators/formBuilder.validators.ts
 * @description Zod validation schemas for form builder endpoints.
 */

import { z } from "zod";
import { STATUS } from "../models/constants/enums";
import { objectIdSchema } from "./event.validators";

const FIELD_TYPE_INPUT = [
  ...STATUS.FIELD_TYPE,
  "radio_button",
  "dropdown",
  "long_question",
  "short_text",
  "phone_number",
] as const;

const optionSchema = z.union([
  z.string().trim().min(1),
  z.object({
    value: z.string().trim().min(1),
    label: z.string().trim().min(1).optional(),
    isDefault: z.boolean().optional(),
  }),
]);

const fieldInputSchema = z.object({
  fieldId: z.string().trim().min(1).optional(),
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  type: z.enum(FIELD_TYPE_INPUT),
  placeholder: z.string().trim().optional(),
  helpText: z.string().trim().optional(),
  options: z.array(optionSchema).optional(),
  required: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const formBuilderUpsertBodySchema = z
  .object({
    formName: z.string().trim().min(1).optional(),
    customQuestions: z.array(fieldInputSchema).optional(),
    customQuestion: z.array(fieldInputSchema).optional(),
    publish: z.boolean().optional(),
  })
  .transform((data) => ({
    formName: data.formName,
    customQuestions: data.customQuestions ?? data.customQuestion,
    publish: data.publish,
  }));

export type FormBuilderUpsertBody = z.infer<typeof formBuilderUpsertBodySchema>;

// --- URL params ---

export const formBuilderEventParamsSchema = z.object({
  eventId: objectIdSchema,
});

export type FormBuilderEventParams = z.infer<
  typeof formBuilderEventParamsSchema
>;

export const formBuilderIndustryParamsSchema = z.object({
  industryId: objectIdSchema,
});

export type FormBuilderIndustryParams = z.infer<
  typeof formBuilderIndustryParamsSchema
>;

export const formBuilderSlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

export type FormBuilderSlugParams = z.infer<typeof formBuilderSlugParamsSchema>;
