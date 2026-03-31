/**
 * @file services/event.service.ts
 * @description Business logic for event operations.
 *
 * Rules:
 *  - No Express types (Request, Response) here — this layer is HTTP-agnostic.
 *  - Import models ONLY from "../models/index.ts" (project convention).
 *  - All DB errors propagate naturally; the controller catches them via next().
 */

import { Event } from '../models';
import type { IEvent } from '../models/schemas/event.schema';
import type { GetAllEventsQuery } from '../validators/event.validators';
import type { PaginatedData } from "../types/api/index";

// The shape of an event document returned from .lean() —
// plain JS object (no Mongoose methods), with _id as string after JSON serialization.
type LeanEvent = IEvent & { _id: unknown; createdAt: Date; updatedAt: Date };

/**
 * Fetches a paginated, filtered, and sorted list of events from MongoDB.
 *
 * @param query - Validated query parameters from the request.
 * @returns    Paginated wrapper containing the event list and metadata.
 */

export async function getAllEvents(
  query: GetAllEventsQuery,
): Promise<PaginatedData<LeanEvent>> {
  const { page, limit, status, category, sortBy, sortOrder } = query;

  // Build the filter object — only add fields that were actually provided.
  // An empty object means "return everything" (no filter applied).
  // Typed as Record<string, unknown> because mongoose v9 no longer exports
  // a public FilterQuery type, and .find() accepts any plain object at runtime.
  const filter: Record<string, unknown> = {};
  if (status)   filter.status   = status;
  if (category) filter.category = { $regex: category, $options: "i" }; // case-insensitive

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const skip = (page - 1) * limit;

  // Run the query and count in parallel — avoids two sequential round-trips.
  const [items, total] = await Promise.all([
    Event.find(filter)
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean<LeanEvent[]>(),    // .lean() returns plain JS objects (faster, no Mongoose overhead)
    Event.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}