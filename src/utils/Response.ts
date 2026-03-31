/**
 * @file utils/apiResponse.ts
 * @description Factory helpers that build and send a consistent JSON response.
 *
 * Usage:
 *   sendSuccess(res, 200, "Events fetched", { items, pagination });
 *   sendError(res, 404, "Event not found");
 */

import type { Response } from "express";
import type { ApiSuccessResponse, ApiErrorResponse } from "../types/api";

export function sendSuccess<T> (
    res: Response,
    statusCode: number,
    message: string,
    data: T,
): void {
    const body: ApiSuccessResponse<T> = { success: true, message, data };
    res.status(statusCode).json(body);
}

export function sendError<T> (
    res: Response,
    statusCode: number,
    message: string,
    errors?: unknown,
): void {
    const body: ApiErrorResponse = {
        success: false,
        message,
        ...(errors !== undefined && { errors }),
    };
    res.status(statusCode).json(body);
}