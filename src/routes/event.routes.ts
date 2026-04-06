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
import registrationRouter from "./registration.routes.js";

const router = Router();

// All event routes are restricted to super_admin and event_operator
router.get("/",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(getAllEventsQuerySchema, "query"),
  handleGetAllEvents,
);

router.post("/",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(createEventBodySchema, "body"),
  handleCreateEvent,
);

router.patch("/:id",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(eventParamsSchema, "params"),
  validate(updateEventBodySchema, "body"),
  handleUpdateEvent,
);

router.delete("/:id",
  requireAuth,
  requireRole("super_admin", "event_operator"),
  validate(eventParamsSchema, "params"),
  handleDeleteEvent,
);

// Nested router — handles all /events/:eventId/registrations/* endpoints.
router.use("/:eventId/registrations", registrationRouter);

export default router;