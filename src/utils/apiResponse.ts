import type { Response } from "express";

export type ApiStatus = "success" | "error";

interface ApiResponse<T> {
  status: ApiStatus;
  message: string;
  data?: T;
  details?: unknown;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "ok",
  statusCode = 200,
): Response<ApiResponse<T>> {
  return res.status(statusCode).json({
    status: "success",
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  details?: unknown,
): Response<ApiResponse<never>> {
  return res.status(statusCode).json({
    status: "error",
    message,
    details,
  });
}
