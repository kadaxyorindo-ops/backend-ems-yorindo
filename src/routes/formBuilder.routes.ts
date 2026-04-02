import { Router } from "express";
import {
  getFormBuilderHandler,
  getFormBuilderBySlugHandler,
  upsertFormBuilderHandler,
} from "../controllers/formBuilder.controller.ts";

const router = Router();

router.get("/events/:eventId", getFormBuilderHandler);
router.get("/slug/:slug", getFormBuilderBySlugHandler);
router.put("/events/:eventId", upsertFormBuilderHandler);

export default router;
