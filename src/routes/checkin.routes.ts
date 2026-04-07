import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.ts";
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
  requireRole("super_admin", "event_operator"),
  validate(checkInEventParamsSchema, "params"),
  handleGetCheckInStats,
);

router.get(
  "/recent",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(checkInEventParamsSchema, "params"),
  validate(recentCheckInsQuerySchema, "query"),
  handleGetRecentCheckIns,
);

router.get(
  "/lookup",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(checkInEventParamsSchema, "params"),
  validate(checkInLookupQuerySchema, "query"),
  handleLookupCheckInCandidates,
);

router.post(
  "/scan",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(checkInEventParamsSchema, "params"),
  validate(scanCheckInBodySchema, "body"),
  handleScanCheckIn,
);

router.post(
  "/manual",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(checkInEventParamsSchema, "params"),
  validate(manualCheckInBodySchema, "body"),
  handleManualCheckIn,
);

export default router;
