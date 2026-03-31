import type { Request, Response } from "express";
import { Types } from "mongoose";
import {
  FormBuilderValidationError,
  getFormBuilderByEvent,
  upsertFormBuilder,
} from "../services/formBuilder.service.ts";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";
import type { FormBuilderUpsertRequest } from "../types/api/index.ts";

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

export async function getFormBuilderHandler(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const { eventId } = req.params;

    if (!eventId || !isValidObjectId(eventId)) {
      return sendError(res, "Invalid eventId", 400);
    }

    const data = await getFormBuilderByEvent(eventId);
    if (!data) {
      return sendError(res, "Event not found", 404);
    }

    return sendSuccess(res, data, "form builder fetched");
  } catch (error) {
    return sendError(res, "failed to fetch form builder", 500, error);
  }
}

export async function upsertFormBuilderHandler(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const { eventId } = req.params;
    const payload = req.body as FormBuilderUpsertRequest;

    if (!eventId || !isValidObjectId(eventId)) {
      return sendError(res, "Invalid eventId", 400);
    }

    const data = await upsertFormBuilder(eventId, payload);
    if (!data) {
      return sendError(res, "Event not found", 404);
    }

    return sendSuccess(res, data, "form builder saved");
  } catch (error) {
    if (error instanceof FormBuilderValidationError) {
      return sendError(res, error.message, error.statusCode);
    }
    return sendError(res, "failed to save form builder", 500, error);
  }
}
