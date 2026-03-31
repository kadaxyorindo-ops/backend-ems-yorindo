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
import { getAllEvents, createEvent } from "../services/event.service";
import { sendSuccess } from "../utils/Response";
import type { CreateEventBody } from "../validators/event.validators";

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

    const event = await createEvent(body);

    sendSuccess(res, 201, "Event created successfully", event);
  } catch (error) {
    next(error);
  }
}