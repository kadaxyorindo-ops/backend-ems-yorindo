/**
 * @file middlewares/error.middleware.ts
 * @description Global Express error handler. Must be registered LAST in app.ts
 * (after all routes), and must have exactly 4 parameters — Express identifies
 * it as an error handler by the function signature (err, req, res, next).
 *
 * Catches:
 *   - ZodError  → 422 Unprocessable Entity (validation failure)
 *   - Error     → 500 Internal Server Error (unexpected runtime error)
 *   - unknown   → 500 fallback
 */

import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { sendError } from "../utils/apiResponse";

export const errorHandler: ErrorRequestHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    // Zod validation errors -> 422 with structured field errors
    if (err instanceof ZodError) {
        sendError(res, 422, "Validation failed", err.issues);
        return;
    }

    // Any other error -> 500
    if (err instanceof Error) {
        console.error("[ERROR]", err.message, err.stack);
        sendError(res, 500, "An unexpected error occured");
        return;
    }

    // Safety fallback for non-Error throws
    console.error("[ERROR] Unknown error type thrown: ", err);
    sendError(res, 500, "An unexpected error occured");
};
