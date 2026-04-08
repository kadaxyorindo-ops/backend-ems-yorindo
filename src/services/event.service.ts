/**
 * @file services/event.service.ts
 * @description Business logic for event operations.
 *
 * Rules:
 *  - No Express types (Request, Response) here — this layer is HTTP-agnostic.
 *  - Import models ONLY from "../models/index.ts" (project convention).
 *  - All DB errors propagate naturally; the controller catches them via next().
 */

import { Event, Registration } from "../models/index.ts";
import type { IEvent } from "../models/schemas/event.schema.ts";
import type {
  GetAllEventsQuery,
  CreateEventBody,
  UpdateEventBody,
} from "../validators/event.validators.ts";
import type { PaginatedData } from "../types/api/index.ts";
import { Types, type PipelineStage } from "mongoose";
import { slugifyUnique } from "../utils/slugify.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A lean event document returned from the aggregation pipeline.
 * Extends the base IEvent with computed registration count fields that are
 * attached by the $lookup + $addFields stages in getAllEvents.
 */
export type EventWithCounts = IEvent & {
  _id: unknown;
  createdAt: Date;
  updatedAt: Date;
  /** Number of registrations with status "approved" for this event. */
  approvedCount: number;
  /** Number of registrations with status "pending" for this event. */
  pendingCount: number;
  /**
   * Total non-rejected registrations (approved + pending).
   * This is the denominator used in the progress bar on the event list:
   * approvedCount / totalCount = "what fraction has been approved".
   */
  totalCount: number;
};

/**
 * Stats returned by getEventStats for the dashboard header cards.
 */
export interface EventStats {
  /**
   * Sum of approved registrations across all events in the system.
   * Used for the "Total Impact" stat card.
   */
  totalApprovedAcrossAllEvents: number;

  /**
   * The single nearest future event (earliest eventDate > now) with
   * status "upcoming" or "registration". Null if no such event exists.
   * Used for the "Upcoming Milestone" stat card.
   */
  nearestUpcomingEvent: {
    _id: unknown;
    title: string;
    eventDate: Date;
    status: string;
    industry: { refId: unknown; name: string | null };
  } | null;
}

// ---------------------------------------------------------------------------
// getEventById
// ---------------------------------------------------------------------------

/**
 * Fetches a single event by its id.
 * Returns null if no document with that _id exists (controller handles 404).
 */
export async function getEventById(
  id: string,
): Promise<(IEvent & { _id: unknown }) | null> {
  const doc = await Event.findById(id).lean<IEvent & { _id: unknown }>();
  return doc;
}

// ---------------------------------------------------------------------------
// getAllEvents
// ---------------------------------------------------------------------------

/**
 * Fetches a paginated, filtered, and sorted list of events.
 * Each event document is augmented with registration count fields via a
 * $lookup pipeline so the progress bar on the UI can be rendered without
 * a second round-trip.
 *
 * Architecture note — why $facet?
 *   We need both the paginated items AND a total count in one query.
 *   $facet runs two independent sub-pipelines against the same $match result:
 *     - "items"  → sorted, paginated, then joined with registrations
 *     - "total"  → just a $count
 *
 *   Crucially, the $lookup is placed INSIDE the "items" sub-pipeline, AFTER
 *   $skip and $limit. This means the registration join only executes against
 *   the 5 events on the current page — not the entire events collection.
 */
export async function getAllEvents(
  query: GetAllEventsQuery,
): Promise<PaginatedData<EventWithCounts>> {
  const { page, limit, status, category, search, sortBy, sortOrder } = query;

  // Build the pre-aggregation filter.
  const filter: Record<string, unknown> = {};
  if (status)   filter.status   = status;
  if (category) filter.category = { $regex: category, $options: "i" };
  if (search)   filter.title    = { $regex: search,   $options: "i" };

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const skip = (page - 1) * limit;

  const PipelineStage = [
    // Stage 1 — filter the events collection.
    { $match: filter },

    // Stage 2 — $facet splits into two independent sub-pipelines.
    {
      $facet: {
        // ── Sub-pipeline A: paginated items with registration counts ──────
        items: [
          // Sort before pagination so the correct window is selected.
          { $sort: { [sortBy]: sortDirection } },
          { $skip: skip },
          { $limit: limit },

          // Join the registrations collection.
          // Using a pipeline-style $lookup so we can filter by status
          // inside the join — MongoDB only returns the docs we need.
          {
            $lookup: {
              from: "registrations",
              let: { eventId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$eventId", "$$eventId"] },
                    // Only pull approved and pending — rejected and
                    // checked_in are excluded from the progress bar.
                    status: { $in: ["approved", "pending"] },
                  },
                },
                // We only need the status field for counting — projecting
                // it keeps the lookup documents small.
                { $project: { status: 1 } },
              ],
              as: "registrationDocs",
            },
          },

          // Compute the three count fields from the joined array.
          {
            $addFields: {
              approvedCount: {
                $size: {
                  $filter: {
                    input: "$registrationDocs",
                    as:    "reg",
                    cond:  { $eq: ["$$reg.status", "approved"] },
                  },
                },
              },
              pendingCount: {
                $size: {
                  $filter: {
                    input: "$registrationDocs",
                    as:    "reg",
                    cond:  { $eq: ["$$reg.status", "pending"] },
                  },
                },
              },
              // totalCount = approvedCount + pendingCount (derived below)
              totalCount: { $size: "$registrationDocs" },
            },
          },

          // Remove the raw joined array — the counts are all we need.
          { $project: { registrationDocs: 0 } },
        ],

        // ── Sub-pipeline B: total count for pagination metadata ──────────
        total: [
          { $count: "count" },
        ],
      },
    },
  ];

  const [result] = await Event.aggregate(PipelineStage);

  const items: EventWithCounts[] = result?.items  ?? [];
  const total: number            = result?.total[0]?.count ?? 0;

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

// ---------------------------------------------------------------------------
// getEventStats
// ---------------------------------------------------------------------------

/**
 * Returns global dashboard stats for the two header stat cards:
 *   1. Total approved registrations across ALL events.
 *   2. The nearest upcoming event (earliest future eventDate with
 *      status "upcoming" or "registration").
 *
 * These are intentionally separated from getAllEvents because they are
 * global aggregates — they do not belong on individual event rows.
 * The frontend calls this endpoint once on page load for the stat cards.
 */
export async function getEventStats(): Promise<EventStats> {
  const now = new Date();

  // Run both queries in parallel — no dependency between them.
  const [countResult, nearestEvent] = await Promise.all([
    // Query 1 — count all approved registrations across all events.
    Registration.countDocuments({ status: "approved" }),

    // Query 2 — find the nearest upcoming event.
    Event.findOne({
      status:    { $in: ["upcoming", "registration"] },
      eventDate: { $gt: now },
    })
      .sort({ eventDate: 1 }) // ascending = nearest first
      .select("title eventDate status industry")
      .lean<Pick<IEvent, "title" | "eventDate" | "status" | "industry"> & { _id: Types.ObjectId }>(),
  ]);

  return {
    totalApprovedAcrossAllEvents: countResult,
    nearestUpcomingEvent: nearestEvent
      ? {
          _id:       nearestEvent._id,
          title:     nearestEvent.title,
          eventDate: nearestEvent.eventDate,
          status:    nearestEvent.status,
          industry:  nearestEvent.industry,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// createEvent
// ---------------------------------------------------------------------------

/**
 * Creates a new event. Status is always forced to "draft" — never from client.
 */
export async function createEvent(
  body: CreateEventBody,
  userId: string,
): Promise<IEvent & { _id: unknown }> {
  // Using new Event().save() instead of Event.create() — see existing
  // codebase comment in the original file for the TypeScript reason.
  const doc = await new Event({
    title:       body.title,
    slug:        slugifyUnique(body.title),
    description: body.description,
    category:    body.category,
    industry:    body.industry,
    eventDate:   body.eventDate,
    location:    body.location,
    // maxCapacity removed — client does not use hard capacity limits.
    status: "draft",
    registrationForm: {
      version:     1,
      fields:      body.registrationForm.fields,
      publishedAt: null,
    },
    surveyId:  null,
    createdBy: new Types.ObjectId(userId),
    updatedBy: null,
  }).save();

  return doc.toObject();
}

// ---------------------------------------------------------------------------
// updateEvent
// ---------------------------------------------------------------------------

/**
 * Partially updates an event. Only provided fields are changed.
 * Returns null if no document with that _id exists (controller handles 404).
 */
export async function updateEvent(
  id: string,
  body: UpdateEventBody,
  userId: string,
): Promise<(IEvent & { _id: unknown }) | null> {
  const { registrationForm, ...rest } = body;

  const update: Record<string, unknown> = {
    ...rest,
    updatedBy: new Types.ObjectId(userId),
  };

  // Regenerate slug if title is being updated.
  if (rest.title !== undefined) {
    update.slug = slugifyUnique(rest.title);
  }

  // Use dot-notation for the nested registrationForm.fields to avoid
  // accidentally overwriting version and publishedAt sibling fields.
  if (registrationForm !== undefined) {
    update["registrationForm.fields"] = registrationForm.fields;
  }

  const doc = await Event.findByIdAndUpdate(
    id,
    { $set: update },
    {
      new:          true, // return the updated document
      runValidators: true,
    },
  ).lean<IEvent & { _id: unknown }>();

  return doc;
}

// ---------------------------------------------------------------------------
// deleteEvent (soft delete)
// ---------------------------------------------------------------------------

/**
 * Soft-deletes an event by setting its status to "cancelled".
 * The document is preserved — all linked registrations and audit logs remain.
 * Returns null if no document with that _id exists (controller handles 404).
 */
export async function deleteEvent(
  id: string,
  userId: string,
): Promise<(IEvent & { _id: unknown }) | null> {
  const doc = await Event.findByIdAndUpdate(
    id,
    {
      $set: {
        status:    "cancelled",
        updatedBy: new Types.ObjectId(userId),
      },
    },
    { new: true },
  ).lean<IEvent & { _id: unknown }>();

  return doc;
}
