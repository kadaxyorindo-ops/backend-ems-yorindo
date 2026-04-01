import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware.ts";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";
import {
  createCommunicationCampaign,
  getCommunicationAudience,
  type CommunicationAudienceFilters,
} from "../services/communication.service.ts";

const communicationRouter = Router();

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

const campaignBodySchema = z.object({
  mode: z.enum(["draft", "send"]),
  eventId: z.string().trim().nullable().optional(),
  subject: z.string().default(""),
  bodyHtml: z.string().default(""),
  bodyText: z.string().optional(),
  bodyJson: z.unknown().nullable().optional(),
  filters: audienceQuerySchema.optional(),
  recipientRegistrationIds: z.array(z.string().trim()).default([]),
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
      subject: parsedBody.data.subject,
      bodyHtml: parsedBody.data.bodyHtml,
      recipientRegistrationIds: parsedBody.data.recipientRegistrationIds,
      createdByUserId,
      ...(parsedBody.data.eventId !== undefined
        ? { eventId: parsedBody.data.eventId }
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

export default communicationRouter;
