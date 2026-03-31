/**
 * @file validators/event.validator.ts
 * @description Zod validation schemas for event API endpoints.
 *
 * Exports both:
 *  - The Zod schema (used by the validate middleware at the route layer)
 *  - The inferred TypeScript type (used by the controller and service)
 *
 * Adding a new query param? Add it to the Zod schema here — the TypeScript
 * type and the runtime validation update automatically.
 */

import { z } from "zod";
import { STATUS } from "../models/constants/enums.ts";

// Reusable ObjectId validator — used for :id params and reference fields
export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Must be a valid MongoDB ObjectId");

/**
 * Query parameters accepted by GET /api/v1/events.
 *
 * All fields are optional with sensible defaults:
 *   page      → which page to return (default: 1)
 *   limit     → items per page, capped at 100 (default: 10)
 *   status    → filter by event lifecycle status
 *   category  → case-insensitive partial match on category
 *   sortBy    → which field to sort on (default: eventDate)
 *   sortOrder → ascending or descending (default: desc)
 */
export const getAllEventsQuerySchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(10),
  status:    z.enum(STATUS.EVENT).optional(),
  category:  z.string().trim().min(1).optional(),
  sortBy:    z.enum(["eventDate", "createdAt", "title"]).default("eventDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// TypeScript type inferred directly from the schema — single source of truth.
export type GetAllEventsQuery = z.infer<typeof getAllEventsQuerySchema>;

// Reusable sub-schema in the mongoose model
const OptionSchema = z.object({
  value:     z.string().trim().min(1),
  label:     z.string().trim().min(1),
  isDefault: z.boolean().default(false),
});

const ValidationRuleSchema = z.object({
  required:  z.boolean().default(false),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  minValue:  z.number().optional(),
  maxValue:  z.number().optional(),
  regex:     z.string().optional(),
});

const VisibilityRuleSchema = z.object({
  UserRole:         z.array(z.enum(STATUS.USER_ROLE)).optional(),
  eventCategories:  z.array(z.string().trim().min(1)).optional(),
  dependsOnFieldId: z.string().trim().optional(),
  operator:         z.enum(["equals", "not_equals", "in", "not_in", "exists"]).optional(),
  value:            z.unknown().optional(),
});

const RegistrationFieldSchema = z.object({
  fieldId:     z.string().trim().min(1),
  key:         z.string().trim().min(1),
  label:       z.string().trim().min(1),
  type:        z.enum(STATUS.FIELD_TYPE),
  order:       z.number().int().min(1),
  isFixed:     z.boolean().default(false),
  placeholder: z.string().trim().optional(),
  helpText:    z.string().trim().optional(),
  options:     z.array(OptionSchema).optional(),
  validation:  ValidationRuleSchema.default({ required: false }),
  visibility:  z.array(VisibilityRuleSchema).optional(),
  isActive:    z.boolean().default(true),
});

// --- new: create event body schema ---

export const createEventBodySchema = z.object({
  title:       z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1).nullable().default(null),
  category:    z.string().trim().min(1).nullable().default(null),
  eventDate:   z.coerce.date(),           // accepts ISO string "2025-12-01T09:00:00Z"
  location:    z.string().trim().min(1).nullable().default(null),
  maxCapacity: z.number().int().min(1).nullable().default(null),
  registrationForm: z.object({
    fields: z.array(RegistrationFieldSchema).default([]),
  }).default({ fields: [] }),
  createdBy:   objectIdSchema,
  // status is intentionally excluded — always forced to "draft" in the service
});

export type CreateEventBody = z.infer<typeof createEventBodySchema>;

// --- URL params for routes that target a single event ---
export const eventParamsSchema = z.object({
  id: objectIdSchema,
});

export type EventParams = z.infer<typeof eventParamsSchema>;

// All the same fields as createEventBodySchema, all optional (PATCH semantics).
// createdBy excluded — immutable after creation.
// status excluded — system-controlled via its own endpoint.
// updatedBy required — who is making this change.
export const updateEventBodySchema = z.object({
  title:       z.string().trim().min(1, "Title is required").optional(),
  description: z.string().trim().min(1).nullable().optional(),
  category:    z.string().trim().min(1).nullable().optional(),
  eventDate:   z.coerce.date().optional(),
  location:    z.string().trim().min(1).nullable().optional(),
  maxCapacity: z.number().int().min(1).nullable().optional(),
  registrationForm: z.object({
    fields: z.array(RegistrationFieldSchema),
  }).optional(),
  updatedBy: objectIdSchema,
}).strict();

export type UpdateEventBody = z.infer<typeof updateEventBodySchema>;