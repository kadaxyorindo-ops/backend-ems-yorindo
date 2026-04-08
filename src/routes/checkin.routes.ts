import { Router } from "express";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import {
  handleGetCheckInStats,
  handleGetRecentCheckIns,
  handleLookupCheckInCandidates,
  handleManualCheckIn,
  handleScanCheckIn,
} from "../controllers/checkin.controller.ts";
import {
  checkInEventParamsSchema,
  checkInLookupQuerySchema,
  manualCheckInBodySchema,
  recentCheckInsQuerySchema,
  scanCheckInBodySchema,
} from "../validators/checkin.validators.ts";

const router = Router({ mergeParams: true });

router.get(
  "/stats",
  requireAuth,
  requirePermission("registrations:checkin"),
  validate(checkInEventParamsSchema, "params"),
  handleGetCheckInStats,
);

router.get(
  "/recent",
  requireAuth,
  requirePermission("registrations:checkin"),
  validate(checkInEventParamsSchema, "params"),
  validate(recentCheckInsQuerySchema, "query"),
  handleGetRecentCheckIns,
);

router.get(
  "/lookup",
  requireAuth,
  requirePermission("registrations:checkin"),
  validate(checkInEventParamsSchema, "params"),
  validate(checkInLookupQuerySchema, "query"),
  handleLookupCheckInCandidates,
);

router.post(
  "/scan",
  requireAuth,
  requirePermission("registrations:checkin"),
  validate(checkInEventParamsSchema, "params"),
  validate(scanCheckInBodySchema, "body"),
  handleScanCheckIn,
);

router.post(
  "/manual",
  requireAuth,
  requirePermission("registrations:checkin"),
  validate(checkInEventParamsSchema, "params"),
  validate(manualCheckInBodySchema, "body"),
  handleManualCheckIn,
);

export default router;
