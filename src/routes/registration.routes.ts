/**
 * @file routes/registration.routes.ts
 * @description Express router for registration management endpoints.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import {
  handleApproveRegistration,
  handleBulkApproveRegistrations,
  handleBulkRejectRegistrations,
  handleGetRegistrationFilters,
  handleGetRegistrations,
  handleRejectAllPending,
  handleRejectRegistration,
} from "../controllers/registration.controller.ts";
import {
  bulkApproveBodySchema,
  bulkRejectBodySchema,
  eventIdParamsSchema,
  getRegistrationsQuerySchema,
  registrationParamsSchema,
  rejectBodySchema,
} from "../validators/registration.validators.ts";

const router = Router({ mergeParams: true });

router.get(
  "/",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(eventIdParamsSchema, "params"),
  validate(getRegistrationsQuerySchema, "query"),
  handleGetRegistrations,
);

router.get(
  "/filters",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(eventIdParamsSchema, "params"),
  handleGetRegistrationFilters,
);

router.patch(
  "/bulk-approve",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(eventIdParamsSchema, "params"),
  validate(bulkApproveBodySchema, "body"),
  handleBulkApproveRegistrations,
);

router.patch(
  "/bulk-reject",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(eventIdParamsSchema, "params"),
  validate(bulkRejectBodySchema, "body"),
  handleBulkRejectRegistrations,
);

router.patch(
  "/reject-all",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(eventIdParamsSchema, "params"),
  handleRejectAllPending,
);

router.patch(
  "/:id/approve",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(registrationParamsSchema, "params"),
  handleApproveRegistration,
);

router.patch(
  "/:id/reject",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(registrationParamsSchema, "params"),
  validate(rejectBodySchema, "body"),
  handleRejectRegistration,
);

export default router;
