import { Router } from "express";
import {
  getFormBuilderHandler,
  getFormBuilderBySlugHandler,
  upsertFormBuilderHandler,
} from "../controllers/formBuilder.controller.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import { formBuilderUpsertBodySchema } from "../validators/formBuilder.validators.ts";

const router = Router();

router.get("/events/:eventId", getFormBuilderHandler);
router.get("/slug/:slug", getFormBuilderBySlugHandler);
router.put(
  "/events/:eventId",
  validate(formBuilderUpsertBodySchema, "body"),
  upsertFormBuilderHandler,
);

export default router;
