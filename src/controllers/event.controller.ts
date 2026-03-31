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
import type { GetAllEventsQuery } from "../validators/event.validators";
import { getAllEvents, createEvent, updateEvent, deleteEvent } from "../services/event.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import type { CreateEventBody, EventParams, UpdateEventBody, DeleteEventBody } from "../validators/event.validators";

/**
 * GET /api/v1/events
 * Returns a paginated list of events, optionally filtered and sorted.
 */

export async function handleGetAllEvents(
    _req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        // res.locals.parsed.query is set by the validate middleware.
        // It holds the Zod-parsed and coerced version of req.query, with correct
        // types (e.g. page/limit as numbers, not strings) and applied defaults.
        const query = res.locals.parsed.query as GetAllEventsQuery;

        const result = await getAllEvents(query);

        sendSuccess(res, 200, "Events fetched successfully", result);

    } catch (error) {
        // Pass any DB or runtime error to the global error handler (error.middleware.ts)
        next(error);
    }
}

/**
 * POST /api/v1/events
 * Creates a new event. Status is always forced to "draft" by the service.
 * createdBy comes from the request body for now; will move to req.user._id
 * once auth middleware is implemented.
 */
export async function handleCreateEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = res.locals.parsed.body as CreateEventBody;
    const userId = req.auth!.sub;

    const event = await createEvent(body, userId);

    sendSuccess(res, 201, "Event created successfully", event);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/events/:id
 * Partially updates an event. Only provided fields are changed.
 * updatedBy comes from the request body for now; will move to req.user._id
 * once auth middleware is implemented.
 */
export async function handleUpdateEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = res.locals.parsed.params as EventParams;
    const body    = res.locals.parsed.body   as UpdateEventBody;
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

/**
 * DELETE /api/v1/events/:id
 * Soft-deletes an event by setting its status to "cancelled".
 * The document is preserved in the database — all linked registrations,
 * surveys, and audit logs remain intact and resolvable.
 */
export async function handleDeleteEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = res.locals.parsed.params as EventParams;
    const userId   = req.auth!.sub;

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