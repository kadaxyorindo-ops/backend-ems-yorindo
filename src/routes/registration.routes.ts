/**
 * @file routes/registration.routes.ts
 * @description Express router for registration management endpoints.
 */

import { Router } from "express";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  handleApproveRegistration,
  handleBulkApproveRegistrations,
  handleBulkRejectRegistrations,
  handleGetRegistrationFilters,
  handleGetRegistrations,
  handleRejectAllPending,
  handleRejectRegistration,
} from "../controllers/registration.controller";
import {
  bulkApproveBodySchema,
  bulkRejectBodySchema,
  eventIdParamsSchema,
  getRegistrationsQuerySchema,
  registrationParamsSchema,
  rejectBodySchema,
} from "../validators/registration.validators";

const router = Router({ mergeParams: true });

router.get(
  "/",
  requireAuth,
  requirePermission("registrations:view"),
  validate(eventIdParamsSchema, "params"),
  validate(getRegistrationsQuerySchema, "query"),
  handleGetRegistrations,
);

router.get(
  "/filters",
  requireAuth,
  requirePermission("registrations:view"),
  validate(eventIdParamsSchema, "params"),
  handleGetRegistrationFilters,
);

router.patch(
  "/bulk-approve",
  requireAuth,
  requirePermission("registrations:approve"),
  validate(eventIdParamsSchema, "params"),
  validate(bulkApproveBodySchema, "body"),
  handleBulkApproveRegistrations,
);

router.patch(
  "/bulk-reject",
  requireAuth,
  requirePermission("registrations:approve"),
  validate(eventIdParamsSchema, "params"),
  validate(bulkRejectBodySchema, "body"),
  handleBulkRejectRegistrations,
);

router.patch(
  "/reject-all",
  requireAuth,
  requirePermission("registrations:approve"),
  validate(eventIdParamsSchema, "params"),
  handleRejectAllPending,
);

router.patch(
  "/:id/approve",
  requireAuth,
  requirePermission("registrations:approve"),
  validate(registrationParamsSchema, "params"),
  handleApproveRegistration,
);

router.patch(
  "/:id/reject",
  requireAuth,
  requirePermission("registrations:approve"),
  validate(registrationParamsSchema, "params"),
  validate(rejectBodySchema, "body"),
  handleRejectRegistration,
);

export default router;
