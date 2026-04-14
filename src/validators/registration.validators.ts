/**
 * @file validators/registration.validators.ts
 * @description Zod validation schemas for registration management endpoints.
 *
 * Exports both the Zod schema (used by validate middleware) and the inferred
 * TypeScript type (used by controllers and services).
 */

import { z } from "zod";
import { STATUS } from "../models/constants/enums";
import { objectIdSchema } from "./event.validators";

// --- Params ---

/** Params for routes that only need the parent eventId (no :id segment). */
export const eventIdParamsSchema = z.object({
  eventId: objectIdSchema,
});

export type EventIdParams = z.infer<typeof eventIdParamsSchema>;

/** Params for routes targeting a single registration (:eventId + :id). */
export const registrationParamsSchema = z.object({
  eventId: objectIdSchema,
  id: objectIdSchema,
});

export type RegistrationParams = z.infer<typeof registrationParamsSchema>;

// --- Query ---

/**
 * Query parameters for GET /events/:eventId/registrations.
 *
 * search  → matches against participant name or organization name
 * status  → filter by registration lifecycle status
 * sector  → filter by industry (ObjectId of industrySnapshot.refId)
 */
export const getRegistrationsQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(STATUS.REGISTRATION).optional(),
  sector: objectIdSchema.optional(),
  search: z.string().trim().min(1).optional(),
});

export type GetRegistrationsQuery = z.infer<typeof getRegistrationsQuerySchema>;

// --- Bodies ---

/** Body for PATCH .../bulk-approve — requires at least one registration ID. */
export const bulkApproveBodySchema = z.object({
  ids: z.array(objectIdSchema).min(1, "At least one registration ID is required"),
});

export type BulkApproveBody = z.infer<typeof bulkApproveBodySchema>;

/**
 * Body for PATCH .../:id/reject.
 * rejectionReason is optional — schema supports it but UI flow is not yet designed.
 * Application layer does not enforce it; the field is stored as-is when provided.
 */
export const rejectBodySchema = z.object({
  rejectionReason: z.string().trim().min(1).optional(),
});

export type RejectBody = z.infer<typeof rejectBodySchema>;

/** Body for PATCH .../bulk-reject — requires at least one registration ID. */
export const bulkRejectBodySchema = z.object({
  ids: z.array(objectIdSchema).min(1, "At least one registration ID is required"),
});

export type BulkRejectBody = z.infer<typeof bulkRejectBodySchema>;