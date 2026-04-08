/**
 * @file routes/analytics.routes.ts
 * @description Stub router for /analytics endpoints.
 *
 * This module is not yet implemented. All routes return 501 Not Implemented.
 * Replace the notImplemented handler with real controllers when the analytics
 * module is built by the assigned team.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware.ts";

const router = Router();

function notImplemented(_req: Request, res: Response) {
  res.status(501).json({
    success: false,
    message: "This feature is not yet available.",
  });
}

// GET / — analytics overview
router.get("/", requireAuth, requirePermission("analytics:view"), notImplemented);

// GET /events/:eventId — per-event analytics
router.get("/events/:eventId", requireAuth, requirePermission("analytics:view"), notImplemented);

export default router;
