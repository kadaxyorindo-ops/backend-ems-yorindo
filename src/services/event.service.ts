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
import type { GetAllEventsQuery, CreateEventBody, UpdateEventBody, DeleteEventBody } from '../validators/event.validators';
import type { PaginatedData } from "../types/api/index";
import { Types } from 'mongoose';

// The shape of an event document returned from .lean() —
// plain JS object (no Mongoose methods), with _id as string after JSON serialization.
type LeanEvent = IEvent & { _id: unknown; createdAt: Date; updatedAt: Date };

/**
 * Fetches a paginated, filtered, and sorted list of events from MongoDB.
 *
 * @param query - Validated query parameters from the request.
 * @returns    Paginated wrapper containing the event list and metadata.
 */

// Get all event
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

// Create Event
export async function createEvent(body: CreateEventBody): Promise<IEvent & { _id: unknown }> {
  // Use `new Event().save()` instead of `Event.create()` — Mongoose v9's strict
  // TypeScript overloads on create() fail to resolve when the input is complex,
  // causing the return type to collapse to `never`. The two-step approach avoids
  // that ambiguity and gives TypeScript a concrete HydratedDocument to work with.
  const doc = await new Event({
    title:            body.title,
    description:      body.description,
    category:         body.category,
    eventDate:        body.eventDate,
    location:         body.location,
    maxCapacity:      body.maxCapacity,
    status:           "draft",             // always forced — never from client input
    registrationForm: {
      version:     1,                      // starts at 1 on creation
      fields:      body.registrationForm.fields,
      publishedAt: null,                   // null until the event is published
    },
    surveyId:  null,
    createdBy: new Types.ObjectId(body.createdBy),
    updatedBy: null,
  }).save();

  return doc.toObject();
}

// Update Event
export async function updateEvent(
  id: string,
  body: UpdateEventBody,
): Promise<(IEvent & { _id: unknown }) | null> {
  const { updatedBy, registrationForm, ...rest } = body;

  // Build the update payload explicitly.
  // Spreading `rest` handles all scalar fields (title, description, etc.).
  // registrationForm.fields is nested, so it needs dot-notation to avoid
  // overwriting sibling fields like version and publishedAt.
  const update: Record<string, unknown> = {
    ...rest,
    updatedBy: new Types.ObjectId(updatedBy),
  };

  if (registrationForm !== undefined) {
    update["registrationForm.fields"] = registrationForm.fields;
  }

  const doc = await Event.findByIdAndUpdate(
    id,
    { $set: update },
    {
      new: true,        // return the updated document, not the original
      runValidators: true, // run Mongoose schema validators on the new values
    },
  ).lean<IEvent & { _id: unknown }>();

  // Returns null if no document with that _id exists — controller handles the 404
  return doc;
}

// Delete Event (soft delete — sets status to "cancelled")
export async function deleteEvent(
  id: string,
  body: DeleteEventBody,
): Promise<(IEvent & { _id: unknown }) | null> {
  const doc = await Event.findByIdAndUpdate(
    id,
    {
      $set: {
        status:    "cancelled",                       // soft delete via lifecycle status
        updatedBy: new Types.ObjectId(body.updatedBy),
      },
    },
    { new: true },
  ).lean<IEvent & { _id: unknown }>();

  // Returns null if no document with that _id exists — controller handles the 404
  return doc;
}