import { Event } from "../models/index.ts";
import { slugify } from "../utils/slugify.ts";
import type { IEvent } from "../models/schemas/event.schema.ts";
import type { EventCreateRequest } from "../types/api/index.ts";

async function ensureUniqueSlug(base: string): Promise<string> {
  const baseSlug = base || `event-${Date.now()}`;
  let candidate = baseSlug;
  let counter = 1;

  while (await Event.exists({ slug: candidate })) {
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }

  return candidate;
}

export async function createEvent(payload: EventCreateRequest): Promise<IEvent> {
  const eventDate = payload.eventDate instanceof Date
    ? payload.eventDate
    : new Date(payload.eventDate);

  const baseSlug = slugify(payload.slug ?? payload.title);
  const slug = await ensureUniqueSlug(baseSlug);

  const event = await Event.create({
    _id: payload.eventId,
    slug,
    title: payload.title,
    description: payload.description ?? null,
    eventDate,
    location: payload.location ?? null,
    status: payload.status,
    maxCapacity: payload.maxCapacity ?? null,
    createdBy: payload.createdBy,
    updatedBy: null,
  });

  return event.toObject();
}

export async function listEvents(): Promise<IEvent[]> {
  return Event.find()
    .sort({ eventDate: -1 })
    .lean();
}
