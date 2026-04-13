import { Router } from "express";
import { z } from "zod";
import {
  requireAuth,
  requirePermission,
} from "../middlewares/auth.middleware.ts";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";
import {
  createCommunicationCampaign,
  getCommunicationAudience,
  listCommunicationCampaignHistory,
  getCommunicationDraftDetail,
  listCommunicationDrafts,
  previewCommunicationCampaign,
  type CommunicationCampaignHistoryFilters,
  type CommunicationAudienceFilters,
} from "../services/communication.service.ts";
import { COMMUNICATION_EMAIL_TEMPLATE_IDS } from "../services/communication-template.service.ts";
import { generateEmailContent } from "../services/communication-ai.service.ts";

const communicationRouter = Router();
const communicationTemplateSchema = z.enum(COMMUNICATION_EMAIL_TEMPLATE_IDS);

const audienceQuerySchema = z.object({
  eventId: z.string().trim().optional(),
  status: z
    .enum([
      "all",
      "all_participants",
      "pending",
      "approved",
      "rejected",
      "checked_in",
    ])
    .optional(),
  participantType: z.enum(["all", "participant", "exhibitor"]).optional(),
  companyId: z.string().trim().optional(),
  industryId: z.string().trim().optional(),
  jobTitleId: z.string().trim().optional(),
  cityId: z.string().trim().optional(),
  sourceChannelCode: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

const campaignHistoryQuerySchema = z.object({
  status: z
    .enum(["all", "draft", "queued", "processing", "sent", "partial", "failed"])
    .optional(),
  search: z.string().trim().optional(),
});

const campaignBodySchema = z.object({
  mode: z.enum(["draft", "send"]),
  draftId: z.string().trim().nullable().optional(),
  eventId: z.string().trim().nullable().optional(),
  templateId: communicationTemplateSchema.default("executive_brief"),
  previewText: z.string().trim().nullable().optional(),
  subject: z.string().default(""),
  bodyHtml: z.string().default(""),
  bodyText: z.string().optional(),
  bodyJson: z.unknown().nullable().optional(),
  filters: audienceQuerySchema.optional(),
  recipientRegistrationIds: z.array(z.string().trim()).default([]),
});

const previewBodySchema = z.object({
  eventId: z.string().trim().nullable().optional(),
  templateId: communicationTemplateSchema.default("executive_brief"),
  previewText: z.string().trim().nullable().optional(),
  subject: z.string().default(""),
  bodyHtml: z.string().default(""),
  bodyText: z.string().optional(),
  sampleRegistrationId: z.string().trim().nullable().optional(),
});

function toAudienceFilters(
  input: z.infer<typeof audienceQuerySchema>,
): CommunicationAudienceFilters {
  return {
    ...(input.eventId ? { eventId: input.eventId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.participantType
      ? { participantType: input.participantType }
      : {}),
    ...(input.companyId ? { companyId: input.companyId } : {}),
    ...(input.industryId ? { industryId: input.industryId } : {}),
    ...(input.jobTitleId ? { jobTitleId: input.jobTitleId } : {}),
    ...(input.cityId ? { cityId: input.cityId } : {}),
    ...(input.sourceChannelCode
      ? { sourceChannelCode: input.sourceChannelCode }
      : {}),
    ...(input.search ? { search: input.search } : {}),
  };
}

function toCampaignHistoryFilters(
  input: z.infer<typeof campaignHistoryQuerySchema>,
): CommunicationCampaignHistoryFilters {
  return {
    ...(input.status ? { status: input.status } : {}),
    ...(input.search ? { search: input.search } : {}),
  };
}

communicationRouter.get(
  "/audience",
  requireAuth,
  requirePermission("communication:view"),
  async (req, res) => {
    const parsedQuery = audienceQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
      return sendError(
        res,
        400,
        "Invalid audience filters.",
        parsedQuery.error.flatten(),
      );
    }

    try {
      const result = await getCommunicationAudience(
        toAudienceFilters(parsedQuery.data),
      );
      return sendSuccess(
        res,
        200,
        "Communication audience loaded successfully.",
        result,
      );
    } catch (error) {
      return sendError(
        res,
        400,
        error instanceof Error
          ? error.message
          : "Failed to load communication audience.",
      );
    }
  },
);

communicationRouter.get(
  "/drafts",
  requireAuth,
  requirePermission("communication:view"),
  async (req, res) => {
    const createdByUserId = req.auth?.sub;

    if (!createdByUserId) {
      return sendError(res, 401, "Login session not found.");
    }

    try {
      const drafts = await listCommunicationDrafts(createdByUserId);
      return sendSuccess(res, 200, "Draft list loaded successfully.", drafts);
    } catch (error) {
      return sendError(
        res,
        400,
        error instanceof Error ? error.message : "Failed to load draft list.",
      );
    }
  },
);

communicationRouter.get(
  "/drafts/:draftId",
  requireAuth,
  requirePermission("communication:view"),
  async (req, res) => {
    const createdByUserId = req.auth?.sub;
    const draftId = Array.isArray(req.params.draftId)
      ? req.params.draftId[0]
      : req.params.draftId;

    if (!createdByUserId) {
      return sendError(res, 401, "Login session not found.");
    }

    if (!draftId) {
      return sendError(res, 400, "The requested draft is invalid.");
    }

    try {
      const draft = await getCommunicationDraftDetail(createdByUserId, draftId);
      return sendSuccess(res, 200, "Draft loaded successfully.", draft);
    } catch (error) {
      return sendError(
        res,
        400,
        error instanceof Error ? error.message : "Failed to load draft.",
      );
    }
  },
);

communicationRouter.get(
  "/campaigns",
  requireAuth,
  requirePermission("communication:view"),
  async (req, res) => {
    const parsedQuery = campaignHistoryQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
      return sendError(
        res,
        400,
        "Invalid campaign history filters.",
        parsedQuery.error.flatten(),
      );
    }

    try {
      const campaigns = await listCommunicationCampaignHistory(
        toCampaignHistoryFilters(parsedQuery.data),
      );
      return sendSuccess(
        res,
        200,
        "Campaign history loaded successfully.",
        campaigns,
      );
    } catch (error) {
      return sendError(
        res,
        400,
        error instanceof Error
          ? error.message
          : "Failed to load campaign history.",
      );
    }
  },
);

communicationRouter.post(
  "/campaigns",
  requireAuth,
  requirePermission("communication:send"),
  async (req, res) => {
    const parsedBody = campaignBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
      return sendError(
        res,
        400,
        "Invalid email campaign payload.",
        parsedBody.error.flatten(),
      );
    }

    const createdByUserId = req.auth?.sub;

    if (!createdByUserId) {
      return sendError(res, 401, "Login session not found.");
    }

    try {
      const result = await createCommunicationCampaign({
        mode: parsedBody.data.mode,
        ...(parsedBody.data.draftId !== undefined
          ? { draftId: parsedBody.data.draftId }
          : {}),
        templateId: parsedBody.data.templateId,
        subject: parsedBody.data.subject,
        bodyHtml: parsedBody.data.bodyHtml,
        recipientRegistrationIds: parsedBody.data.recipientRegistrationIds,
        createdByUserId,
        ...(parsedBody.data.eventId !== undefined
          ? { eventId: parsedBody.data.eventId }
          : {}),
        ...(parsedBody.data.previewText !== undefined
          ? { previewText: parsedBody.data.previewText }
          : {}),
        ...(parsedBody.data.bodyText !== undefined
          ? { bodyText: parsedBody.data.bodyText }
          : {}),
        ...(parsedBody.data.bodyJson !== undefined
          ? { bodyJson: parsedBody.data.bodyJson }
          : {}),
        ...(parsedBody.data.filters
          ? { filters: toAudienceFilters(parsedBody.data.filters) }
          : {}),
      });

      return sendSuccess(res, 201, result.message, result);
    } catch (error) {
      return sendError(
        res,
        400,
        error instanceof Error
          ? error.message
          : "Failed to save email campaign.",
      );
    }
  },
);

communicationRouter.post(
  "/preview",
  requireAuth,
  requirePermission("communication:view"),
  async (req, res) => {
    const parsedBody = previewBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
      return sendError(
        res,
        400,
        "Invalid email preview payload.",
        parsedBody.error.flatten(),
      );
    }

    try {
      const result = await previewCommunicationCampaign({
        templateId: parsedBody.data.templateId,
        subject: parsedBody.data.subject,
        bodyHtml: parsedBody.data.bodyHtml,
        ...(parsedBody.data.eventId !== undefined
          ? { eventId: parsedBody.data.eventId }
          : {}),
        ...(parsedBody.data.previewText !== undefined
          ? { previewText: parsedBody.data.previewText }
          : {}),
        ...(parsedBody.data.bodyText !== undefined
          ? { bodyText: parsedBody.data.bodyText }
          : {}),
        ...(parsedBody.data.sampleRegistrationId !== undefined
          ? { sampleRegistrationId: parsedBody.data.sampleRegistrationId }
          : {}),
      });

      return sendSuccess(
        res,
        200,
        "Email preview generated successfully.",
        result,
      );
    } catch (error) {
      return sendError(
        res,
        400,
        error instanceof Error
          ? error.message
          : "Failed to generate email preview.",
      );
    }
  },
);

const generateBodySchema = z.object({
  eventId: z.string().trim().min(1, "eventId is required"),
  currentSubject: z.string().trim().optional(),
  currentPreviewText: z.string().trim().optional(),
  currentBodyText: z.string().trim().optional(),
  templateId: communicationTemplateSchema.optional(),
  customPrompt: z.string().trim().max(500).optional(),
});

communicationRouter.post(
  "/generate",
  requireAuth,
  requirePermission("communication:view"),
  async (req, res) => {
    const parsedBody = generateBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
      return sendError(
        res,
        400,
        "Invalid generate request payload.",
        parsedBody.error.flatten(),
      );
    }

    try {
      const result = await generateEmailContent(parsedBody.data);
      return sendSuccess(
        res,
        200,
        "Email content generated successfully.",
        result,
      );
    } catch (error) {
      return sendError(
        res,
        400,
        error instanceof Error
          ? error.message
          : "Failed to generate email content.",
      );
    }
  },
);

export default communicationRouter;
