import { Router } from "express";
import {
  getFormBuilderHandler,
  upsertFormBuilderHandler,
} from "../controllers/formBuilder.controller.ts";

const router = Router();

router.get("/events/:eventId", getFormBuilderHandler);
router.put("/events/:eventId", upsertFormBuilderHandler);

export default router;
