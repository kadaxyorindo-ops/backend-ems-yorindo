import type { Request, Response } from "express";
import { Types } from "mongoose";
import {
  FormBuilderValidationError,
  getFormBuilderByEvent,
  getFormBuilderBySlug,
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
      return sendError(res, 400, "Invalid eventId");
    }

    const data = await getFormBuilderByEvent(eventId);
    if (!data) {
      return sendError(res, 404, "Event not found");
    }

    return sendSuccess(res, 200, "form builder fetched", data);
  } catch (error) {
    return sendError(res, 500, "failed to fetch form builder", error);
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
      return sendError(res, 400, "Invalid eventId");
    }

    const data = await upsertFormBuilder(eventId, payload);
    if (!data) {
      return sendError(res, 404, "Event not found");
    }

    return sendSuccess(res, 200, "form builder saved", data);
  } catch (error) {
    if (error instanceof FormBuilderValidationError) {
      return sendError(res, error.statusCode, error.message);
    }
    return sendError(res, 500, "failed to save form builder", error);
  }
}

export async function getFormBuilderBySlugHandler(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== "string") {
      return sendError(res, 400, "Invalid slug");
    }

    const data = await getFormBuilderBySlug(slug);
    if (!data) {
      return sendError(res, 404, "Event not found");
    }

    return sendSuccess(res, 200, "form builder fetched", data);
  } catch (error) {
    return sendError(res, 500, "failed to fetch form builder", error);
  }
}
