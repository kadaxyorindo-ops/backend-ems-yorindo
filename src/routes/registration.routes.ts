/**
 * @file routes/registration.routes.ts
 * @description Express router for registration management endpoints.
 *
 * This router is mounted as a nested router under the event router:
 *   eventRouter.use("/:eventId/registrations", registrationRouter)
 *
 * `mergeParams: true` is required so that :eventId from the parent route is
 * accessible in the validate middleware and service layer here.
 *
 * Route ordering matters:
 *   Static segments (/filters, /bulk-approve, /reject-all) are declared before
 *   dynamic segments (/:id/approve, /:id/reject) so Express does not mistake
 *   a static path for an ObjectId param.
 */

import { Router } from "express";
import { validate } from "../middlewares/validate.middleware.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import {
  eventIdParamsSchema,
  registrationParamsSchema,
  getRegistrationsQuerySchema,
  bulkApproveBodySchema,
  rejectBodySchema,
} from "../validators/registration.validators.js";
import {
  handleGetRegistrations,
  handleGetRegistrationFilters,
  handleApproveRegistration,
  handleRejectRegistration,
  handleBulkApproveRegistrations,
  handleRejectAllPending,
} from "../controllers/registration.controller.js";

// mergeParams: true — inherits :eventId from the parent event router.
const router = Router({ mergeParams: true });

// --- Read ---

// GET /events/:eventId/registrations
router.get(
  "/",
  requireAuth,
  requireRole("super_admin", "admin"),
  validate(eventIdParamsSchema, "params"),
  validate(getRegistrationsQuerySchema, "query"),
  handleGetRegistrations,
);

// GET /events/:eventId/registrations/filters
router.get(
  "/filters",
  requireAuth,
  requireRole("super_admin", "admin"),
  validate(eventIdParamsSchema, "params"),
  handleGetRegistrationFilters,
);

// --- Bulk mutations (static paths — must come before /:id routes) ---

// PATCH /events/:eventId/registrations/bulk-approve
router.patch(
  "/bulk-approve",
  requireAuth,
  requireRole("super_admin", "admin"),
  validate(eventIdParamsSchema, "params"),
  validate(bulkApproveBodySchema, "body"),
  handleBulkApproveRegistrations,
);

// PATCH /events/:eventId/registrations/reject-all
router.patch(
  "/reject-all",
  requireAuth,
  requireRole("super_admin", "admin"),
  validate(eventIdParamsSchema, "params"),
  handleRejectAllPending,
);

// --- Single-record mutations ---

// PATCH /events/:eventId/registrations/:id/approve
router.patch(
  "/:id/approve",
  requireAuth,
  requireRole("super_admin", "admin"),
  validate(registrationParamsSchema, "params"),
  handleApproveRegistration,
);

// PATCH /events/:eventId/registrations/:id/reject
router.patch(
  "/:id/reject",
  requireAuth,
  requireRole("super_admin", "admin"),
  validate(registrationParamsSchema, "params"),
  validate(rejectBodySchema, "body"),
  handleRejectRegistration,
);

export default router;
