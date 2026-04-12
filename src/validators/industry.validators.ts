/**
 * @file validators/industry.validators.ts
 * @description Zod validation schemas for industry endpoints.
 */

import { z } from "zod";

export const createIndustryBodySchema = z
  .object({
    name: z.string().trim().min(1, "Industry name is required"),
  })
  .strict();

export type CreateIndustryBody = z.infer<typeof createIndustryBodySchema>;

