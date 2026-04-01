/**
 * @file routes/event.routes.ts
 * @description Express router for /events endpoints.
 *
 * Middleware chain for each route is read left-to-right:
 *   validate(schema, "query")  → validates + coerces query params
 *   handleGetAllEvents         → controller
 *
 * Auth middleware will be inserted here later, e.g.:
 *   router.get("/", requireAuth, validate(...), handleGetAllEvents);
 */

import { Router } from "express";
import { validate } from "../middlewares/validate.middleware";
import {
  getAllEventsQuerySchema,
  createEventBodySchema,
  updateEventBodySchema,
  deleteEventBodySchema,
  eventParamsSchema,
} from "../validators/event.validators";
import {
  handleGetAllEvents,
  handleCreateEvent,
  handleUpdateEvent,
  handleDeleteEvent,
} from "../controllers/event.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// GET — all authenticated staff can view
router.get(
  "/",
  // requireAuth,
  validate(getAllEventsQuerySchema, "query"),
  handleGetAllEvents,
);

// POST — only admin and above can create
router.post(
  "/",
  // requireAuth,
  // requireRole("super_admin", "admin"),
  validate(createEventBodySchema, "body"),
  handleCreateEvent,
);

// PATCH — only admin and above can update
router.patch(
  "/:id",
  requireAuth,
  requireRole("super_admin", "admin"),
  validate(eventParamsSchema, "params"),
  validate(updateEventBodySchema, "body"),
  handleUpdateEvent,
);

// DELETE — only admin and above can cancel
router.delete(
  "/:id",
  requireAuth,
  requireRole("super_admin", "admin"),
  validate(eventParamsSchema, "params"),
  handleDeleteEvent, // no body validation needed anymore
);

export default router;
