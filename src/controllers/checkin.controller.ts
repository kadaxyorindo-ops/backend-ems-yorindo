import type { NextFunction, Request, Response } from "express";
import { sendError, sendSuccess } from "../utils/apiResponse";
import {
  CheckInError,
  getCheckInStats,
  getRecentCheckIns,
  lookupCheckInCandidates,
  manualCheckIn,
  scanCheckIn,
} from "../services/checkin.service";
import type {
  CheckInEventParams,
  CheckInLookupQuery,
  ManualCheckInBody,
  RecentCheckInsQuery,
  ScanCheckInBody,
} from "../validators/checkin.validators";

function handleCheckInFailure(
  error: unknown,
  res: Response,
  next: NextFunction,
) {
  if (error instanceof CheckInError) {
    sendError(res, error.statusCode, error.message);
    return;
  }

  next(error);
}

export async function handleGetCheckInStats(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as CheckInEventParams;
    const result = await getCheckInStats(eventId);
    sendSuccess(res, 200, "Check-in stats fetched successfully", result);
  } catch (error) {
    handleCheckInFailure(error, res, next);
  }
}

export async function handleGetRecentCheckIns(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as CheckInEventParams;
    const { limit } = res.locals.parsed.query as RecentCheckInsQuery;
    const result = await getRecentCheckIns(eventId, limit);
    sendSuccess(res, 200, "Recent check-ins fetched successfully", result);
  } catch (error) {
    handleCheckInFailure(error, res, next);
  }
}

export async function handleLookupCheckInCandidates(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as CheckInEventParams;
    const { search, limit } = res.locals.parsed.query as CheckInLookupQuery;
    const result = await lookupCheckInCandidates(eventId, search, limit);
    sendSuccess(res, 200, "Check-in lookup fetched successfully", result);
  } catch (error) {
    handleCheckInFailure(error, res, next);
  }
}

export async function handleScanCheckIn(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as CheckInEventParams;
    const { qrPayload } = res.locals.parsed.body as ScanCheckInBody;
    const result = await scanCheckIn(eventId, qrPayload, req.auth!.sub);

    sendSuccess(res, 200, result.message, result);
  } catch (error) {
    handleCheckInFailure(error, res, next);
  }
}

export async function handleManualCheckIn(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as CheckInEventParams;
    const { registrationId, notes } = res.locals.parsed.body as ManualCheckInBody;
    const result = await manualCheckIn({
      eventId,
      registrationId,
      userId: req.auth!.sub,
      ...(notes ? { notes } : {}),
    });

    sendSuccess(res, 200, result.message, result);
  } catch (error) {
    handleCheckInFailure(error, res, next);
  }
}
