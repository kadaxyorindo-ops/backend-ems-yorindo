import { Router } from "express";
import { createEventHandler, listEventsHandler } from "../controllers/event.controller.ts";
import {
  getFormBuilderHandler,
  upsertFormBuilderHandler,
} from "../controllers/formBuilder.controller.ts";

const router = Router();

router.get("/", listEventsHandler);
router.post("/", createEventHandler);

// Alias form builder routes under events for convenience
router.get("/:eventId/form", getFormBuilderHandler);
router.put("/:eventId/form", upsertFormBuilderHandler);

export default router;
