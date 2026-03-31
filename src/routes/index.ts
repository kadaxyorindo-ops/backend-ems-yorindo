import { Router } from "express";
import eventRoutes from "./event.routes.ts";
import formBuilderRoutes from "./formBuilder.routes.ts";

const router = Router();

router.use("/events", eventRoutes);
router.use("/form-builder", formBuilderRoutes);

export default router;
