import type { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import {
  getFormBuilderByEvent,
  getFormBuilderBySlug,
  upsertFormBuilder,
} from "../services/formBuilder.service.ts";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";
import type { FormBuilderUpsertBody } from "../validators/formBuilder.validators.ts";

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

export async function getFormBuilderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = req.params;

    if (!eventId || !isValidObjectId(eventId)) {
      sendError(res, 400, "Invalid eventId");
      return;
    }

    const data = await getFormBuilderByEvent(eventId);
    if (!data) {
      sendError(res, 404, "Event not found");
      return;
    }

    sendSuccess(res, 200, "form builder fetched", data);
  } catch (error) {
    next(error);
  }
}

export async function upsertFormBuilderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = req.params;
    const payload = res.locals.parsed.body as FormBuilderUpsertBody;

    if (!eventId || !isValidObjectId(eventId)) {
      sendError(res, 400, "Invalid eventId");
      return;
    }

    const data = await upsertFormBuilder(eventId, payload);
    if (!data) {
      sendError(res, 404, "Event not found");
      return;
    }

    sendSuccess(res, 200, "form builder saved", data);
  } catch (error) {
    next(error);
  }
}

export async function getFormBuilderBySlugHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== "string") {
      sendError(res, 400, "Invalid slug");
      return;
    }

    const data = await getFormBuilderBySlug(slug);
    if (!data) {
      sendError(res, 404, "Event not found");
      return;
    }

    sendSuccess(res, 200, "form builder fetched", data);
  } catch (error) {
    next(error);
  }
}
