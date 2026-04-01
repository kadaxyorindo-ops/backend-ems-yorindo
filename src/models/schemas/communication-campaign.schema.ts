import { Schema, model, Types } from "mongoose";

export interface ICommunicationCampaign {
  eventId: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  sentBy: Types.ObjectId | null;
  status: "draft" | "sent" | "partial" | "failed";
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  bodyJson: Record<string, unknown> | null;
  filtersSnapshot: Record<string, unknown>;
  audience: {
    recipientCount: number;
    recipients: Array<{
      registrationId: Types.ObjectId;
      participantId: Types.ObjectId;
      email: string;
      name: string;
    }>;
  };
  delivery: {
    successCount: number;
    failureCount: number;
    failures: Array<{
      email: string;
      reason: string;
    }>;
  };
  sentAt: Date | null;
}

const CommunicationCampaignSchema = new Schema<ICommunicationCampaign>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: ["draft", "sent", "partial", "failed"],
      default: "draft",
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    bodyHtml: {
      type: String,
      default: "",
    },
    bodyText: {
      type: String,
      default: null,
    },
    bodyJson: {
      type: Schema.Types.Mixed,
      default: null,
    },
    filtersSnapshot: {
      type: Schema.Types.Mixed,
      default: {},
    },
    audience: {
      recipientCount: {
        type: Number,
        default: 0,
      },
      recipients: {
        type: [
          new Schema(
            {
              registrationId: {
                type: Schema.Types.ObjectId,
                ref: "Registration",
                required: true,
              },
              participantId: {
                type: Schema.Types.ObjectId,
                ref: "Participant",
                required: true,
              },
              email: {
                type: String,
                trim: true,
                required: true,
              },
              name: {
                type: String,
                trim: true,
                required: true,
              },
            },
            { _id: false },
          ),
        ],
        default: [],
      },
    },
    delivery: {
      successCount: {
        type: Number,
        default: 0,
      },
      failureCount: {
        type: Number,
        default: 0,
      },
      failures: {
        type: [
          new Schema(
            {
              email: {
                type: String,
                trim: true,
                required: true,
              },
              reason: {
                type: String,
                trim: true,
                required: true,
              },
            },
            { _id: false },
          ),
        ],
        default: [],
      },
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "communication_campaigns",
  },
);

CommunicationCampaignSchema.index({ createdBy: 1, createdAt: -1 });
CommunicationCampaignSchema.index({ eventId: 1, createdAt: -1 });
CommunicationCampaignSchema.index({ status: 1, createdAt: -1 });

export const CommunicationCampaign = model<ICommunicationCampaign>(
  "CommunicationCampaign",
  CommunicationCampaignSchema,
);
