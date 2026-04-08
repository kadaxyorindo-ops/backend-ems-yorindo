/**
 * @file routes/industry.routes.ts
 * @description Express router for /industries endpoints.
 *
 * Read-only — industries are managed directly in the database by admins.
 * No create/update/delete endpoints are exposed through this API.
 */

import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.ts";
import { handleGetAllIndustries, handleCreateIndustry } from "../controllers/industry.controller.ts";

const router = Router();

// GET / — all authenticated staff can read industry master data.
// Used to populate dropdown menus in the event creation/edit forms.
router.get("/", requireAuth, handleGetAllIndustries);
router.post("/", requireAuth, handleCreateIndustry);

export default router;