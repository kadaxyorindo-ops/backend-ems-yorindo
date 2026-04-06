import { z } from "zod";
import { STATUS } from "../models/constants/enums.ts"; // SYSTEM_ROLE used for role validation

export const getUsersQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
  role:   z.enum(STATUS.SYSTEM_ROLE).optional(),
});

export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;

export const createUserBodySchema = z.object({
  name:             z.string().trim().min(1, "Name is required"),
  email:            z.string().trim().email("Invalid email address"),
  role:             z.enum(STATUS.SYSTEM_ROLE),
  organizationName: z.string().trim().min(1).nullable().default(null),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;

export const updateUserBodySchema = z.object({
  name:             z.string().trim().min(1).optional(),
  role:             z.enum(STATUS.SYSTEM_ROLE).optional(),
  organizationName: z.string().trim().min(1).nullable().optional(),
}).strict();

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;

export const userParamsSchema = z.object({
  id: z.string().trim().regex(/^[a-f\d]{24}$/i, "Must be a valid MongoDB ObjectId"),
});

export type UserParams = z.infer<typeof userParamsSchema>;
