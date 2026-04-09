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
  handleHardDeleteEvent,
} from "../controllers/event.controller.ts";
import {
  requireAuth,
  requirePermission,
} from "../middlewares/auth.middleware.ts";
import registrationRouter from "./registration.routes.js";
import { getEventSurveyAnalytics } from "../controllers/analytics.controller.ts";
import { generateEventAIInsight } from "../controllers/ai.controller.ts";
import checkInRouter from "./checkin.routes.ts";

const router = Router();

// GET /stats — MUST be before GET /:id (see file-level comment above).
router.get(
  "/stats",
  requireAuth,
  requirePermission("events:view"),
  handleGetEventStats,
);

// GET / — list events.
router.get(
  "/",
  requireAuth,
  requirePermission("events:view"),
  validate(getAllEventsQuerySchema, "query"),
  handleGetAllEvents,
);

// POST / — create event.
router.post(
  "/",
  requireAuth,
  requirePermission("events:create"),
  validate(createEventBodySchema, "body"),
  handleCreateEvent,
);

// GET /- get event by id
router.get(
  "/:id",
  requireAuth,
  validate(eventParamsSchema, "params"),
  handleGetEventById,
);

// PATCH /:id — update event.
router.patch(
  "/:id",
  requireAuth,
  requirePermission("events:edit"),
  validate(eventParamsSchema, "params"),
  validate(updateEventBodySchema, "body"),
  handleUpdateEvent,
);

// DELETE /:id — cancel event.
router.delete(
  "/:id",
  requireAuth,
  requirePermission("events:delete"),
  validate(eventParamsSchema, "params"),
  handleDeleteEvent,
);

// DELETE /:id/hard — permanent delete.
router.delete(
  "/:id/hard",
  requireAuth,
  requirePermission("events:delete"),
  validate(eventParamsSchema, "params"),
  handleHardDeleteEvent,
);

// GET — View Event Survey Analytics (hanya untuk admin/super_admin)
router.get(
  "/:eventId/analytics",
  // requireAuth,
  // requireRole("super_admin", "admin", "exhibitor"),
  getEventSurveyAnalytics,
);

// GET — Generate AI Insight dari data Survey
router.get(
  "/:eventId/analytics/ai-insight",
  // requireAuth,
  // requireRole("super_admin", "admin", "exhibitor"),
  generateEventAIInsight,
);

// Nested router — handles all /events/:eventId/registrations/* endpoints.
router.use("/:eventId/registrations", registrationRouter);
router.use("/:eventId/check-ins", checkInRouter);

export default router;
