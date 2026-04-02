/**
 * @file controllers/event.controller.ts
 * @description HTTP handlers for event endpoints.
 *
 * Each handler:
 *  1. Reads the validated data from the request (query/body/params).
 *  2. Delegates to the service layer for business logic.
 *  3. Sends the result using the apiResponse helpers.
 *  4. Forwards any error to the global error handler via next(error).
 *
 * Controllers never contain business logic or direct DB calls.
 */

import type { Request, Response, NextFunction } from "express";
import type { GetAllEventsQuery } from "../validators/event.validators.ts";
import {
  getAllEvents,
  getEventStats,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../services/event.service.ts";
import { sendSuccess, sendError } from "../utils/apiResponse.ts";
import type {
  CreateEventBody,
  EventParams,
  UpdateEventBody,
} from "../validators/event.validators.ts";

// ---------------------------------------------------------------------------
// GET /api/v1/events
// ---------------------------------------------------------------------------

/**
 * Returns a paginated list of events with per-event registration counts.
 * Each item includes approvedCount, pendingCount, and totalCount fields
 * computed via a $facet aggregation in the service layer.
 */
export async function handleGetAllEvents(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = res.locals.parsed.query as GetAllEventsQuery;
    const result = await getAllEvents(query);
    sendSuccess(res, 200, "Events fetched successfully", result);
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/events/stats
// ---------------------------------------------------------------------------

/**
 * Returns global dashboard stats for the two header stat cards:
 *   - totalApprovedAcrossAllEvents  → "Total Impact" card
 *   - nearestUpcomingEvent          → "Upcoming Milestone" card
 *
 * This endpoint is intentionally separate from getAllEvents because these
 * are global aggregates — they do not belong on individual event rows.
 *
 * Route placement note:
 *   This route is registered as GET /stats BEFORE GET /:id in event.routes.ts.
 *   If it were registered after, Express would treat the literal string "stats"
 *   as an ObjectId param and the objectIdSchema validation would reject it.
 */
export async function handleGetEventStats(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await getEventStats();
    sendSuccess(res, 200, "Event stats fetched successfully", stats);
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/events
// ---------------------------------------------------------------------------

/**
 * Creates a new event. Status is always forced to "draft" by the service.
 */
export async function handleCreateEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body   = res.locals.parsed.body as CreateEventBody;
    const userId = req.auth!.sub;

    const event = await createEvent(body, userId);
    sendSuccess(res, 201, "Event created successfully", event);
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/events/:id
// ---------------------------------------------------------------------------

/**
 * Partially updates an event. Only provided fields are changed.
 */
export async function handleUpdateEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = res.locals.parsed.params as EventParams;
    const body   = res.locals.parsed.body   as UpdateEventBody;
    const userId = req.auth!.sub;

    const event = await updateEvent(id, body, userId);

    if (!event) {
      sendError(res, 404, "Event not found");
      return;
    }

    sendSuccess(res, 200, "Event updated successfully", event);
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/events/:id
// ---------------------------------------------------------------------------

/**
 * Soft-deletes an event by setting its status to "cancelled".
 * The document is preserved — all linked registrations and audit logs remain.
 */
export async function handleDeleteEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = res.locals.parsed.params as EventParams;
    const userId = req.auth!.sub;

    const event = await deleteEvent(id, userId);

    if (!event) {
      sendError(res, 404, "Event not found");
      return;
    }

    sendSuccess(res, 200, "Event cancelled successfully", event);
  } catch (error) {
    next(error);
  }
}