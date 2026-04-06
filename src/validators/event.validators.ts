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
 * Reusable industry snapshot sub-schema.
 * Matches IMasterSnapshot — stores both the master record reference and the
 * display name at the time of creation so renames don't affect existing records.
 */
const industrySnapshotSchema = z.object({
  refId: objectIdSchema.nullable().default(null),
  name: z.string().trim().min(1).nullable().default(null),
});

/**
 * Query parameters accepted by GET /api/v1/events.
 *
 * All fields are optional with sensible defaults:
 *   page      → which page to return (default: 1)
 *   limit     → items per page, fixed at 5 per client requirement
 *   status    → filter by event lifecycle status
 *   category  → case-insensitive partial match on category
 *   sortBy    → which field to sort on (default: eventDate)
 *   sortOrder → ascending or descending (default: desc)
 */
export const getAllEventsQuerySchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  // Limit is capped at 5 — client confirmed 3-4 events per month maximum.
  limit:     z.coerce.number().int().min(1).max(5).default(5),
  status:    z.enum(STATUS.EVENT).optional(),
  category:  z.string().trim().min(1).optional(),
  search:    z.string().trim().min(1).optional(),
  sortBy:    z.enum(["eventDate", "createdAt", "title"]).default("eventDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// TypeScript type inferred directly from the schema — single source of truth.
export type GetAllEventsQuery = z.infer<typeof getAllEventsQuerySchema>;

// Reusable sub-schemas matching the Mongoose sub-schemas
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

// --- Create event body schema ---

export const createEventBodySchema = z.object({
  title:       z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1).nullable().default(null),
  category:    z.string().trim().min(1).nullable().default(null),

  /**
   * Industry is required on create — every event must belong to an industry.
   * The client confirmed events are tightly coupled to a single industry.
   */
  industry: industrySnapshotSchema,

  eventDate:   z.coerce.date(),
  location:    z.string().trim().min(1).nullable().default(null),

  // maxCapacity intentionally removed — client does not enforce a hard cap.
  // Participant volume is controlled through the approval workflow instead.

  registrationForm: z.object({
    fields: z.array(RegistrationFieldSchema).default([]),
  }).default({ fields: [] }),
  // Optional fallback when auth isn't used.
  createdBy: objectIdSchema.optional(),
  // status is intentionally excluded — always forced to "draft" in the service
});

export type CreateEventBody = z.infer<typeof createEventBodySchema>;

// --- URL params for routes that target a single event ---
export const eventParamsSchema = z.object({
  id: objectIdSchema,
});

export type EventParams = z.infer<typeof eventParamsSchema>;

/**
 * Update event body schema — all fields optional (PATCH semantics).
 *
 * Excluded fields:
 *   - createdBy  → immutable after creation
 *   - updatedBy  → injected from req.auth in the service, never from client
 *   - maxCapacity → removed entirely
 */
export const updateEventBodySchema = z.object({
  title:       z.string().trim().min(1, "Title is required").optional(),
  description: z.string().trim().min(1).nullable().optional(),
  category:    z.string().trim().min(1).nullable().optional(),
  industry:    industrySnapshotSchema.optional(),
  eventDate:   z.coerce.date().optional(),
  location:    z.string().trim().min(1).nullable().optional(),
  status: z.enum(STATUS.EVENT).optional(),
  registrationForm: z.object({
    fields: z.array(RegistrationFieldSchema),
  }).optional(),
}).strict();

export type UpdateEventBody = z.infer<typeof updateEventBodySchema>;

// Body for DELETE /api/v1/events/:id — no body needed, kept for consistency.
export const deleteEventBodySchema = z.object({}).strict();

export type DeleteEventBody = z.infer<typeof deleteEventBodySchema>;