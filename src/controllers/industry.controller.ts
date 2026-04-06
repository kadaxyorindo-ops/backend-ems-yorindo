/**
 * @file controllers/industry.controller.ts
 * @description HTTP handlers for industry master data endpoints.
 *
 * Controllers never contain business logic or direct DB calls.
 */

import type { Request, Response, NextFunction } from "express";
import { getAllIndustries } from "../services/industry.service.ts";
import { sendSuccess } from "../utils/apiResponse.ts";

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