/**
 * @file controllers/registration.controller.ts
 * @description HTTP handlers for registration management endpoints.
 *
 * Each handler:
 *  1. Reads validated data from res.locals.parsed (set by validate middleware).
 *  2. Reads the authenticated user ID from req.auth.sub (set by requireAuth).
 *  3. Delegates to the service layer for all business logic and DB operations.
 *  4. Sends the result using the apiResponse helpers.
 *  5. Forwards any error to the global error handler via next(error).
 *
 * Controllers never contain business logic or direct DB calls.
 */

import type { Request, Response, NextFunction } from "express";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import type {
  EventIdParams,
  RegistrationParams,
  GetRegistrationsQuery,
  BulkApproveBody,
  RejectBody,
} from "../validators/registration.validators.js";
import {
  getRegistrations,
  getRegistrationFilters,
  approveRegistration,
  rejectRegistration,
  bulkApproveRegistrations,
  rejectAllPending,
} from "../services/registration.service.js";

/**
 * GET /events/:eventId/registrations
 * Paginated list of registrations with search, status, and sector filters.
 * Response includes event-level meta counts for the header counter.
 */
export async function handleGetRegistrations(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as EventIdParams;
    const query        = res.locals.parsed.query  as GetRegistrationsQuery;

    const result = await getRegistrations(eventId, query);
    sendSuccess(res, 200, "Registrations fetched successfully", result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /events/:eventId/registrations/filters
 * Returns distinct sectors and statuses present in the event's registrations.
 * Frontend calls this once on page load to populate the filter dropdowns.
 */
export async function handleGetRegistrationFilters(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as EventIdParams;

    const result = await getRegistrationFilters(eventId);
    sendSuccess(res, 200, "Filters fetched successfully", result);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /events/:eventId/registrations/:id/approve
 * Approves a single pending registration and generates its QR ticket.
 */
export async function handleApproveRegistration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId, id } = res.locals.parsed.params as RegistrationParams;
    const userId           = req.auth!.sub;

    const registration = await approveRegistration(eventId, id, userId);

    if (!registration) {
      sendError(res, 404, "Registration not found or is not pending");
      return;
    }

    sendSuccess(res, 200, "Registration approved successfully", registration);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /events/:eventId/registrations/:id/reject
 * Rejects a single pending registration. rejectionReason is optional.
 */
export async function handleRejectRegistration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId, id }  = res.locals.parsed.params as RegistrationParams;
    const { rejectionReason } = res.locals.parsed.body as RejectBody;
    const userId              = req.auth!.sub;

    const registration = await rejectRegistration(eventId, id, userId, rejectionReason);

    if (!registration) {
      sendError(res, 404, "Registration not found or is not pending");
      return;
    }

    sendSuccess(res, 200, "Registration rejected successfully", registration);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /events/:eventId/registrations/bulk-approve
 * Approves all selected pending registrations, each getting a unique QR ticket.
 * Non-pending IDs in the list are silently skipped — modifiedCount reflects
 * how many were actually updated.
 */
export async function handleBulkApproveRegistrations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as EventIdParams;
    const { ids }     = res.locals.parsed.body   as BulkApproveBody;
    const userId       = req.auth!.sub;

    const result = await bulkApproveRegistrations(eventId, ids, userId);
    sendSuccess(res, 200, `${result.modifiedCount} registration(s) approved successfully`, result);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /events/:eventId/registrations/reject-all
 * Rejects all pending registrations for the event in one operation.
 * Approved and checked-in registrations are not affected.
 */
export async function handleRejectAllPending(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as EventIdParams;
    const userId       = req.auth!.sub;

    const result = await rejectAllPending(eventId, userId);
    sendSuccess(res, 200, `${result.modifiedCount} pending registration(s) rejected successfully`, result);
  } catch (error) {
    next(error);
  }
}
