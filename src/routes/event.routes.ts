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

const router = Router();

router.get("/", validate(getAllEventsQuerySchema, "query"), handleGetAllEvents);
router.post("/", validate(createEventBodySchema, "body"), handleCreateEvent);
router.patch("/:id", validate(eventParamsSchema,      "params"), validate(updateEventBodySchema,  "body"),  handleUpdateEvent);
router.delete("/:id", validate(eventParamsSchema, "params"), validate(deleteEventBodySchema, "body"), handleDeleteEvent);


export default router;