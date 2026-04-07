/**
 * @file registration.schema.ts
 * @description Schema for event registrations — the join between a
 * participant and an event.
 */

import { Schema, model, Types } from "mongoose";
import { STATUS } from "../constants/enums.js";
import type { RegistrationStatus, UserRole } from "../constants/enums.js";
import type { ICheckInSummary } from "./sub/checkin-summary.schema.js";
import { CheckInSummarySchema } from "./sub/checkin-summary.schema.js";
import type { ICompanySnapshot } from "./sub/company-snapshot.schema.js";
import { CompanySnapshotSchema } from "./sub/company-snapshot.schema.js";
import type { IFormSnapshotField } from "./sub/form-snapshot-field.schema.js";
import { FormSnapshotFieldSchema } from "./sub/form-snapshot-field.schema.js";
import type { IMasterSnapshot } from "./sub/master-snapshot.schema.js";
import { MasterSnapshotSchema } from "./sub/master-snapshot.schema.js";
import type { IRegistrationAnswer } from "./sub/registration-answer.schema.js";
import { RegistrationAnswerSchema } from "./sub/registration-answer.schema.js";
import type { ITicket } from "./sub/ticket.schema.js";
import { TicketSchema } from "./sub/ticket.schema.js";
import type { ITicketDelivery } from "./sub/ticket-delivery.schema.js";
import { TicketDeliverySchema } from "./sub/ticket-delivery.schema.js";

export interface IRegistration {
  eventId: Types.ObjectId;
  participantId: Types.ObjectId;
  participantType: UserRole;
  status: RegistrationStatus;
  approval: {
    approvedBy: Types.ObjectId | null;
    approvedAt: Date | null;
    rejectedBy: Types.ObjectId | null;
    rejectedAt: Date | null;
    rejectionReason: string | null;
  };
  formSnapshot: {
    version: number;
    fields: IFormSnapshotField[];
  };
  answers: IRegistrationAnswer[];
  companySnapshot: ICompanySnapshot;
  industrySnapshot: IMasterSnapshot;
  jobTitleSnapshot: IMasterSnapshot;
  citySnapshot: IMasterSnapshot;
  ticket: ITicket | null;
  ticketDelivery: ITicketDelivery;
  checkIn: ICheckInSummary;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    participantId: {
      type: Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
    },
    participantType: {
      type: String,
      required: true,
      enum: STATUS.USER_ROLE,
    },
    status: {
      type: String,
      required: true,
      enum: STATUS.REGISTRATION,
      default: "pending",
    },
    approval: {
      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      approvedAt: { type: Date, default: null },
      rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      rejectedAt: { type: Date, default: null },
      rejectionReason: { type: String, trim: true, default: null },
    },
    formSnapshot: {
      version: { type: Number, required: true, default: 1 },
      fields: {
        type: [FormSnapshotFieldSchema],
        required: true,
        default: [],
      },
    },
    answers: {
      type: [RegistrationAnswerSchema],
      required: true,
      default: [],
    },
    companySnapshot: {
      type: CompanySnapshotSchema,
      default: () => ({}),
    },
    industrySnapshot: {
      type: MasterSnapshotSchema,
      default: () => ({}),
    },
    jobTitleSnapshot: {
      type: MasterSnapshotSchema,
      default: () => ({}),
    },
    citySnapshot: {
      type: MasterSnapshotSchema,
      default: () => ({}),
    },
    ticket: {
      type: TicketSchema,
      default: null,
    },
    ticketDelivery: {
      type: TicketDeliverySchema,
      default: () => ({}),
    },
    checkIn: {
      type: CheckInSummarySchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: "registrations",
  },
);

RegistrationSchema.index({ eventId: 1, participantId: 1 }, { unique: true });
RegistrationSchema.index({ eventId: 1, status: 1 });
RegistrationSchema.index({ participantId: 1, createdAt: -1 });
RegistrationSchema.index({ eventId: 1, participantType: 1 });
RegistrationSchema.index({ "companySnapshot.companyId": 1 });
RegistrationSchema.index({ "industrySnapshot.refId": 1 });
RegistrationSchema.index({ "citySnapshot.refId": 1 });
RegistrationSchema.index({ eventId: 1, "ticketDelivery.status": 1 });
RegistrationSchema.index({ "ticket.qrCode": 1 }, { unique: true, sparse: true });
RegistrationSchema.index({ "companySnapshot.name": 1 });

export const Registration = model<IRegistration>(
  "Registration",
  RegistrationSchema,
);
