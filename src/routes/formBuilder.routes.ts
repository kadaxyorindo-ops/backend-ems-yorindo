import { Router } from "express";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware";
import {
  getFormBuilderHandler,
  getFormBuilderByIndustryHandler,
  getFormBuilderBySlugHandler,
  upsertFormBuilderHandler,
} from "../controllers/formBuilder.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  formBuilderEventParamsSchema,
  formBuilderIndustryParamsSchema,
  formBuilderSlugParamsSchema,
  formBuilderUpsertBodySchema,
} from "../validators/formBuilder.validators";

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
