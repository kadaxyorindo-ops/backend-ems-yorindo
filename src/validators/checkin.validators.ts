import { z } from "zod";
import { objectIdSchema } from "./event.validators";

export const checkInEventParamsSchema = z.object({
  eventId: objectIdSchema,
});

export type CheckInEventParams = z.infer<typeof checkInEventParamsSchema>;

export const scanCheckInBodySchema = z.object({
  qrPayload: z.string().trim().min(1, "QR payload is required"),
});

export type ScanCheckInBody = z.infer<typeof scanCheckInBodySchema>;

export const manualCheckInBodySchema = z.object({
  registrationId: objectIdSchema,
  notes: z.string().trim().max(300).optional(),
});

export type ManualCheckInBody = z.infer<typeof manualCheckInBodySchema>;

export const checkInLookupQuerySchema = z.object({
  search: z.string().trim().min(1, "Search is required"),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export type CheckInLookupQuery = z.infer<typeof checkInLookupQuerySchema>;

export const recentCheckInsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type RecentCheckInsQuery = z.infer<typeof recentCheckInsQuerySchema>;
