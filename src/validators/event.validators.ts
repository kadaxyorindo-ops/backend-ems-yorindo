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