import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware.ts";
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

const communicationRouter = Router();
const communicationTemplateSchema = z.enum(COMMUNICATION_EMAIL_TEMPLATE_IDS);

const audienceQuerySchema = z.object({
  eventId: z.string().trim().optional(),
  status: z
    .enum(["all", "pending", "approved", "rejected", "checked_in"])
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
    ...(input.participantType ? { participantType: input.participantType } : {}),
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

communicationRouter.get("/audience", requireAuth, async (req, res) => {
  const parsedQuery = audienceQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return sendError(
      res,
      400,
      "Filter audience tidak valid.",
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
      "Audience komunikasi berhasil dimuat.",
      result,
    );
  } catch (error) {
    return sendError(
      res,
      400,
      error instanceof Error
        ? error.message
        : "Gagal memuat audience komunikasi.",
    );
  }
});

communicationRouter.get("/drafts", requireAuth, async (req, res) => {
  const createdByUserId = req.auth?.sub;

  if (!createdByUserId) {
    return sendError(res, 401, "Sesi login tidak ditemukan.");
  }

  try {
    const drafts = await listCommunicationDrafts(createdByUserId);
    return sendSuccess(res, 200, "Daftar draft berhasil dimuat.", drafts);
  } catch (error) {
    return sendError(
      res,
      400,
      error instanceof Error ? error.message : "Gagal memuat daftar draft.",
    );
  }
});

communicationRouter.get("/drafts/:draftId", requireAuth, async (req, res) => {
  const createdByUserId = req.auth?.sub;
  const draftId = Array.isArray(req.params.draftId)
    ? req.params.draftId[0]
    : req.params.draftId;

  if (!createdByUserId) {
    return sendError(res, 401, "Sesi login tidak ditemukan.");
  }

  if (!draftId) {
    return sendError(res, 400, "Draft yang diminta tidak valid.");
  }

  try {
    const draft = await getCommunicationDraftDetail(createdByUserId, draftId);
    return sendSuccess(res, 200, "Draft berhasil dimuat.", draft);
  } catch (error) {
    return sendError(
      res,
      400,
      error instanceof Error ? error.message : "Gagal memuat draft.",
    );
  }
});

communicationRouter.get("/campaigns", requireAuth, async (req, res) => {
  const parsedQuery = campaignHistoryQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return sendError(
      res,
      400,
      "Filter riwayat campaign tidak valid.",
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
      "Riwayat campaign berhasil dimuat.",
      campaigns,
    );
  } catch (error) {
    return sendError(
      res,
      400,
      error instanceof Error
        ? error.message
        : "Gagal memuat riwayat campaign.",
    );
  }
});

communicationRouter.post("/campaigns", requireAuth, async (req, res) => {
  const parsedBody = campaignBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return sendError(
      res,
      400,
      "Payload campaign email tidak valid.",
      parsedBody.error.flatten(),
    );
  }

  const createdByUserId = req.auth?.sub;

  if (!createdByUserId) {
    return sendError(res, 401, "Sesi login tidak ditemukan.");
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
      error instanceof Error ? error.message : "Gagal menyimpan campaign email.",
    );
  }
});

communicationRouter.post("/preview", requireAuth, async (req, res) => {
  const parsedBody = previewBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return sendError(
      res,
      400,
      "Payload preview email tidak valid.",
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

    return sendSuccess(res, 200, "Preview email berhasil dibuat.", result);
  } catch (error) {
    return sendError(
      res,
      400,
      error instanceof Error ? error.message : "Gagal membuat preview email.",
    );
  }
});

export default communicationRouter;
