import { Router } from "express";
import {
  getFormBuilderHandler,
  getFormBuilderByIndustryHandler,
  getFormBuilderBySlugHandler,
  upsertFormBuilderHandler,
} from "../controllers/formBuilder.controller.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import {
  formBuilderEventParamsSchema,
  formBuilderIndustryParamsSchema,
  formBuilderSlugParamsSchema,
  formBuilderUpsertBodySchema,
} from "../validators/formBuilder.validators.ts";

const router = Router();

router.get(
  "/events/:eventId",
  validate(formBuilderEventParamsSchema, "params"),
  getFormBuilderHandler,
);
router.get(
  "/industries/:industryId",
  validate(formBuilderIndustryParamsSchema, "params"),
  getFormBuilderByIndustryHandler,
);
router.get(
  "/slug/:slug",
  validate(formBuilderSlugParamsSchema, "params"),
  getFormBuilderBySlugHandler,
);
router.put(
  "/events/:eventId",
  validate(formBuilderEventParamsSchema, "params"),
  validate(formBuilderUpsertBodySchema, "body"),
  upsertFormBuilderHandler,
);

export default router;
