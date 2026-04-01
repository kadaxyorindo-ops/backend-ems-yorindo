import { Router } from "express";
import formBuilderRoutes from "./formBuilder.routes.ts";

const router = Router();

router.use("/form-builder", formBuilderRoutes);

export default router;
