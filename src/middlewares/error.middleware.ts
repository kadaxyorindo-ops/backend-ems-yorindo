import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.ts";
import { sendError } from "../utils/apiResponse.ts";

export function notFoundHandler(req: Request, res: Response) {
  return sendError(
    res,
    404,
    `Route ${req.method} ${req.originalUrl} tidak ditemukan.`,
  );
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(error);
  }

  const fallbackMessage =
    env.nodeEnv === "production"
      ? "Terjadi kesalahan pada server."
      : error instanceof Error
        ? error.message
        : "Unknown server error";

  console.error("[APP] Unhandled error:", error);
  return sendError(res, 500, fallbackMessage);
}
