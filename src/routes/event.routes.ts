/**
 * @file routes/event.routes.ts
 * @description Express router for /events endpoints.
 *
 * Route ordering is intentional and must not be changed without care:
 *   GET  /stats       → must come BEFORE GET /:id
 *                       If it came after, Express would match the literal
 *                       string "stats" as the :id param and the ObjectId
 *                       validator would reject it with a 422.
 *   GET  /            → paginated event list with registration counts
 *   GET  /:id         → fetch a single event
 *   POST /            → create event
 *   PATCH /:id        → update event
 *   DELETE /:id       → soft-delete (cancel) event
 *   USE /:eventId/... → nested registration router
 */

import { Router } from "express";
import { validate } from "../middlewares/validate.middleware.ts";
import {
  getAllEventsQuerySchema,
  createEventBodySchema,
  updateEventBodySchema,
  eventParamsSchema,
} from "../validators/event.validators.ts";
import {
  handleGetAllEvents,
  handleGetEventById,
  handleGetEventStats,
  handleCreateEvent,
  handleUpdateEvent,
  handleDeleteEvent,
} from "../controllers/event.controller.ts";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.ts";
import registrationRouter from "./registration.routes.js";
import checkInRouter from "./checkin.routes.ts";

const router = Router();

// GET /stats — MUST be before GET /:id (see file-level comment above).
// All authenticated staff can view dashboard stats.
router.get("/stats", requireAuth, handleGetEventStats);

// GET / — all authenticated staff can view the event list.
router.get(
  "/",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(getAllEventsQuerySchema, "query"),
  handleGetAllEvents,
);

// GET /:id — all authenticated staff can view an event by id.
router.get(
  "/:id",
  // requireAuth,
  // requireRole("super_admin", "event_operator"),
  validate(eventParamsSchema, "params"),
  handleGetEventById,
);

// POST / — only admin and above can create events.
router.post(
  "/",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(createEventBodySchema, "body"),
  handleCreateEvent,
);

// PATCH /:id — only admin and above can update events.
router.patch(
  "/:id",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(eventParamsSchema, "params"),
  validate(updateEventBodySchema, "body"),
  handleUpdateEvent,
);

// DELETE /:id — only admin and above can cancel events.
router.delete(
  "/:id",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(eventParamsSchema, "params"),
  handleDeleteEvent,
);

// Nested router — handles all /events/:eventId/registrations/* endpoints.
router.use("/:eventId/registrations", registrationRouter);
router.use("/:eventId/check-ins", checkInRouter);

export default router;
