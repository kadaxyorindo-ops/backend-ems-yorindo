/**
 * @file validators/visitor.validators.ts
 * @description Zod validation schemas for visitor registration endpoint.
 */

import { z } from "zod";
import { objectIdSchema } from "./event.validators.ts";

const customAnswerArraySchema = z.array(
  z.object({
    fieldId: z.string().trim().min(1).optional(),
    label: z.string().trim().min(1).optional(),
    type: z.string().trim().min(1).optional(),
    value: z.unknown(),
  }),
);

const customAnswerObjectSchema = z.record(z.string(), z.unknown());

export const visitorRegistrationBodySchema = z.object({
  event_id: objectIdSchema,
  nama_lengkap: z.string().trim().min(1),
  email_pribadi: z.string().trim().email(),
  email_perusahaan: z.string().trim().email(),
  no_hp: z.string().trim().min(6),
  nama_company: z.string().trim().min(1),
  lokasi_perusahaan: z.string().trim().min(1),
  jenis_industri: z.string().trim().min(1),
  jabatan: z.string().trim().min(1),
  survei_result: z
    .union([customAnswerArraySchema, customAnswerObjectSchema])
    .optional()
    .nullable(),
});

export type VisitorRegistrationBody = z.infer<
  typeof visitorRegistrationBodySchema
>;
