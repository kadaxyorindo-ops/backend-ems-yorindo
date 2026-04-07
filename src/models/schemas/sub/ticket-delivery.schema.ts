import { Schema } from "mongoose";

export const TICKET_DELIVERY_STATUS = [
  "idle",
  "queued",
  "processing",
  "sent",
  "failed",
] as const;

export type TicketDeliveryStatus =
  (typeof TICKET_DELIVERY_STATUS)[number];

export interface ITicketDelivery {
  status: TicketDeliveryStatus;
  queuedAt: Date | null;
  lastAttemptAt: Date | null;
  sentAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  attempts: number;
}

export const TicketDeliverySchema = new Schema<ITicketDelivery>(
  {
    status: {
      type: String,
      enum: TICKET_DELIVERY_STATUS,
      default: "idle",
    },
    queuedAt: {
      type: Date,
      default: null,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      trim: true,
      default: null,
    },
    attempts: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  },
);
