/**
 * @file controllers/industry.controller.ts
 * @description HTTP handlers for industry master data endpoints.
 *
 * Controllers never contain business logic or direct DB calls.
 */

import type { Request, Response, NextFunction } from "express";
import { getAllIndustries, createIndustry } from "../services/industry.service.ts";
import { sendSuccess, sendError } from "../utils/apiResponse.ts";

/**
 * GET /api/v1/industries
 * Returns all industries sorted alphabetically.
 * Used to populate the industry dropdown in event create/edit forms.
 */
export async function handleGetAllIndustries(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const industries = await getAllIndustries();
    sendSuccess(res, 200, "Industries fetched successfully", industries);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/industries
 * Creates a new industry. Returns 409 if name is duplicate or too similar.
 */
export async function handleCreateIndustry(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name } = req.body as { name: string };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      sendError(res, 400, "Industry name is required");
      return;
    }

    const industry = await createIndustry(name);
    sendSuccess(res, 201, "Industry created successfully", industry);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "SIMILAR" || (err as unknown as { code?: number }).code === 11000) {
      sendError(res, 409, err.message || "Industry already exists");
      return;
    }
    next(error);
  }
}