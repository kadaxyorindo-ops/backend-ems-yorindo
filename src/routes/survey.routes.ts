/**
 * @file routes/survey.routes.ts
 * @description Stub router for /surveys endpoints.
 *
 * This module is not yet implemented. All routes return 501 Not Implemented.
 * Replace the notImplemented handler with real controllers when the survey
 * module is built by the assigned team.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware";

const router = Router();

function notImplemented(_req: Request, res: Response) {
  res.status(501).json({
    success: false,
    message: "This feature is not yet available.",
  });
}

// GET / — list surveys
router.get("/", requireAuth, requirePermission("surveys:view"), notImplemented);

// GET /:id — get survey detail
router.get("/:id", requireAuth, requirePermission("surveys:view"), notImplemented);

// POST / — create survey
router.post("/", requireAuth, requirePermission("surveys:manage"), notImplemented);

// PATCH /:id — update survey
router.patch("/:id", requireAuth, requirePermission("surveys:manage"), notImplemented);

// DELETE /:id — delete survey
router.delete("/:id", requireAuth, requirePermission("surveys:manage"), notImplemented);

export default router;
