import { Router } from "express";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware.ts";
import {
  getFormBuilderHandler,
  getFormBuilderBySlugHandler,
  upsertFormBuilderHandler,
} from "../controllers/formBuilder.controller.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import { formBuilderUpsertBodySchema } from "../validators/formBuilder.validators.ts";

const router = Router();

// GET /events/:eventId — staff preview; requires events:view
router.get("/events/:eventId", requireAuth, requirePermission("events:view"), getFormBuilderHandler);

// GET /slug/:slug — public; participants load the form without a token
router.get("/slug/:slug", getFormBuilderBySlugHandler);

// PUT /events/:eventId — staff write; requires events:edit
router.put("/events/:eventId", requireAuth, requirePermission("events:edit"), upsertFormBuilderHandler);

export default router;
