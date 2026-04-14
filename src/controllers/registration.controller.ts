/**
 * @file controllers/registration.controller.ts
 * @description HTTP handlers for registration management endpoints.
 */

import type { NextFunction, Request, Response } from "express";
import { sendError, sendSuccess } from "../utils/apiResponse";
import type {
  BulkApproveBody,
  BulkRejectBody,
  EventIdParams,
  GetRegistrationsQuery,
  RegistrationParams,
  RejectBody,
} from "../validators/registration.validators";
import {
  approveRegistration,
  bulkApproveRegistrations,
  bulkRejectRegistrations,
  getRegistrationFilters,
  getRegistrations,
  rejectAllPending,
  rejectRegistration,
} from "../services/registration.service";

export async function handleGetRegistrations(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as EventIdParams;
    const query = res.locals.parsed.query as GetRegistrationsQuery;

    const result = await getRegistrations(eventId, query);
    sendSuccess(res, 200, "Registrations fetched successfully", result);
  } catch (error) {
    next(error);
  }
}

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

export async function handleApproveRegistration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId, id } = res.locals.parsed.params as RegistrationParams;
    const userId = req.auth!.sub;

    const result = await approveRegistration(eventId, id, userId);

    if (!result) {
      sendError(res, 404, "Registration not found or is not pending");
      return;
    }

    sendSuccess(res, 200, result.message, result);
  } catch (error) {
    next(error);
  }
}

export async function handleRejectRegistration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId, id } = res.locals.parsed.params as RegistrationParams;
    const { rejectionReason } = res.locals.parsed.body as RejectBody;
    const userId = req.auth!.sub;

    const registration = await rejectRegistration(
      eventId,
      id,
      userId,
      rejectionReason,
    );

    if (!registration) {
      sendError(res, 404, "Registration not found or is not pending");
      return;
    }

    sendSuccess(res, 200, "Registration rejected successfully", registration);
  } catch (error) {
    next(error);
  }
}

export async function handleBulkApproveRegistrations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as EventIdParams;
    const { ids } = res.locals.parsed.body as BulkApproveBody;
    const userId = req.auth!.sub;

    const result = await bulkApproveRegistrations(eventId, ids, userId);
    sendSuccess(res, 200, result.message, result);
  } catch (error) {
    next(error);
  }
}

export async function handleRejectAllPending(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as EventIdParams;
    const userId = req.auth!.sub;

    const result = await rejectAllPending(eventId, userId);
    sendSuccess(
      res,
      200,
      `${result.modifiedCount} pending registration(s) rejected successfully`,
      result,
    );
  } catch (error) {
    next(error);
  }
}

export async function handleBulkRejectRegistrations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as EventIdParams;
    const { ids } = res.locals.parsed.body as BulkRejectBody;
    const userId = req.auth!.sub;

    const result = await bulkRejectRegistrations(eventId, ids, userId);
    sendSuccess(
      res,
      200,
      `${result.modifiedCount} registration(s) rejected successfully`,
      result,
    );
  } catch (error) {
    next(error);
  }
}
