import type { Request, Response } from "express";
import { Types } from "mongoose";
import { STATUS } from "../models/constants/enums.ts";
import { createEvent, listEvents } from "../services/event.service.ts";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";
import type { EventCreateRequest } from "../types/api/index.ts";

type EventCreatePayload = EventCreateRequest & {
  event_id?: string;
  admin_id?: string;
  exhibitor_id?: string;
};

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

function isValidDate(input: string | Date): boolean {
  const value = input instanceof Date ? input : new Date(input);
  return !Number.isNaN(value.getTime());
}

export async function createEventHandler(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const payload = req.body as EventCreatePayload;
    const eventId = payload.eventId ?? payload.event_id;
    const createdBy =
      payload.createdBy ?? payload.admin_id ?? payload.exhibitor_id;

    if (!payload?.title || !payload?.eventDate || !createdBy) {
      return sendError(
        res,
        "title, eventDate, and createdBy are required",
        400,
      );
    }

    if (eventId && !isValidObjectId(eventId)) {
      return sendError(res, "Invalid eventId", 400);
    }

    if (!isValidObjectId(createdBy)) {
      return sendError(res, "Invalid createdBy", 400);
    }

    if (!isValidDate(payload.eventDate)) {
      return sendError(res, "Invalid eventDate", 400);
    }

    if (payload.status && !STATUS.EVENT.includes(payload.status)) {
      return sendError(res, "Invalid status", 400);
    }

    if (payload.slug !== undefined && typeof payload.slug !== "string") {
      return sendError(res, "slug must be a string", 400);
    }

    if (payload.maxCapacity !== undefined && payload.maxCapacity !== null) {
      if (typeof payload.maxCapacity !== "number" || payload.maxCapacity < 0) {
        return sendError(res, "maxCapacity must be a non-negative number", 400);
      }
    }

    const event = await createEvent({
      eventId,
      createdBy,
      slug: payload.slug,
      title: payload.title,
      description: payload.description ?? null,
      eventDate: payload.eventDate,
      location: payload.location ?? null,
      status: payload.status,
      maxCapacity: payload.maxCapacity ?? null,
    });

    return sendSuccess(res, event, "event created", 201);
  } catch (error) {
    const code = (error as { code?: number }).code;
    const keyPattern = (error as { keyPattern?: Record<string, number> }).keyPattern;
    if (code === 11000 && keyPattern?.slug) {
      return sendError(res, "slug already exists", 409);
    }
    return sendError(res, "failed to create event", 500, error);
  }
}

export async function listEventsHandler(
  _req: Request,
  res: Response,
): Promise<Response> {
  try {
    const events = await listEvents();
    return sendSuccess(res, events, "events fetched");
  } catch (error) {
    return sendError(res, "failed to fetch events", 500, error);
  }
}
