import { Types } from "mongoose";
import {
  CommunicationCampaign,
  Event,
  Registration,
  Participant,
} from "../models/index.ts";
import { env } from "../config/env.ts";
import { getYorindoLogoAttachment, sendEmailMessage } from "./email.service.ts";
import { enqueueCommunicationCampaignJob } from "./email-queue.service.ts";
import {
  COMMUNICATION_EMAIL_TEMPLATE_IDS,
  renderCommunicationEmail,
  type CommunicationEmailTemplateId,
} from "./communication-template.service.ts";

type RegistrationStatusFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "checked_in";

type ParticipantTypeFilter = "all" | "participant" | "exhibitor";

type CampaignDelivery = {
  successCount: number;
  failureCount: number;
  failures: Array<{ email: string; reason: string }>;
};

type CampaignStatus =
  | "draft"
  | "queued"
  | "processing"
  | "sent"
  | "partial"
  | "failed";

type CampaignHistoryStatusFilter = "all" | CampaignStatus;

export interface CommunicationAudienceFilters {
  eventId?: string;
  status?: RegistrationStatusFilter;
  participantType?: ParticipantTypeFilter;
  companyId?: string;
  industryId?: string;
  jobTitleId?: string;
  cityId?: string;
  sourceChannelCode?: string;
  search?: string;
}

export interface CommunicationAudienceRecipient {
  registrationId: string;
  participantId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  fullName: string;
  email: string;
  participantType: string;
  status: string;
  companyName: string | null;
  industryName: string | null;
  jobTitleName: string | null;
  cityName: string | null;
  sourceChannelCode: string | null;
}

export interface CommunicationAudienceResponse {
  events: Array<{
    id: string;
    title: string;
    eventDate: string;
    status: string;
  }>;
  recipients: CommunicationAudienceRecipient[];
  filterOptions: {
    companies: Array<{ id: string; label: string }>;
    industries: Array<{ id: string; label: string }>;
    jobTitles: Array<{ id: string; label: string }>;
    cities: Array<{ id: string; label: string }>;
    sourceChannels: string[];
  };
  summary: {
    totalRecipients: number;
    statusCounts: Record<string, number>;
  };
}

export interface CreateCommunicationCampaignInput {
  mode: "draft" | "send";
  draftId?: string | null;
  eventId?: string | null;
  templateId: CommunicationEmailTemplateId;
  previewText?: string | null;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  bodyJson?: unknown | null;
  filters?: CommunicationAudienceFilters;
  recipientRegistrationIds: string[];
  createdByUserId: string;
}

export interface PreviewCommunicationCampaignInput {
  eventId?: string | null;
  templateId: CommunicationEmailTemplateId;
  previewText?: string | null;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  sampleRegistrationId?: string | null;
}

export interface CommunicationCampaignPreview {
  templateId: CommunicationEmailTemplateId;
  templateName: string;
  previewText: string;
  subject: string;
  html: string;
  text: string;
  from: {
    name: string;
    email: string;
  };
  sampleRecipient: {
    name: string;
    email: string;
  };
  event: {
    id: string | null;
    title: string | null;
    eventDate: string | null;
  };
}

export interface CommunicationDraftSummary {
  id: string;
  status: "draft";
  subject: string;
  previewText: string | null;
  templateId: CommunicationEmailTemplateId;
  updatedAt: string;
  recipientCount: number;
  event: {
    id: string | null;
    title: string | null;
    eventDate: string | null;
  };
}

export interface CommunicationDraftDetail extends CommunicationDraftSummary {
  bodyHtml: string;
  bodyText: string | null;
  bodyJson: Record<string, unknown> | null;
  filters: CommunicationAudienceFilters;
  recipientRegistrationIds: string[];
}

export interface CommunicationCampaignHistoryFilters {
  status?: CampaignHistoryStatusFilter;
  search?: string;
}

export interface CommunicationCampaignHistoryItem {
  id: string;
  status: CampaignStatus;
  templateId: CommunicationEmailTemplateId;
  templateName: string;
  previewText: string | null;
  subject: string;
  recipientCount: number;
  delivery: CampaignDelivery;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  event: {
    id: string | null;
    title: string | null;
    eventDate: string | null;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface CommunicationCampaignHistoryResponse {
  items: CommunicationCampaignHistoryItem[];
  summary: {
    total: number;
    statusCounts: Record<string, number>;
  };
}

function toObjectId(value?: string | null) {
  if (!value || !Types.ObjectId.isValid(value)) {
    return null;
  }

  return new Types.ObjectId(value);
}

function sortByLabel<T extends { label: string }>(items: T[]) {
  return items.toSorted((left, right) => left.label.localeCompare(right.label));
}

function pickRecipientEmail(participant: {
  companyEmail?: string | null;
  personalEmail?: string | null;
}) {
  return (
    participant.companyEmail?.trim() ||
    participant.personalEmail?.trim() ||
    null
  );
}

function normalizeSearchValue(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = getKey(item);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function buildStatusCounts(recipients: CommunicationAudienceRecipient[]) {
  return recipients.reduce<Record<string, number>>((result, recipient) => {
    result.all = (result.all ?? 0) + 1;
    result[recipient.status] = (result[recipient.status] ?? 0) + 1;
    return result;
  }, {});
}

function getEmptyDelivery(): CampaignDelivery {
  return {
    successCount: 0,
    failureCount: 0,
    failures: [],
  };
}

function buildCampaignStatus(
  delivery: CampaignDelivery,
): Exclude<CampaignStatus, "draft" | "queued" | "processing"> {
  if (delivery.successCount > 0 && delivery.failureCount === 0) {
    return "sent";
  }

  if (delivery.successCount > 0) {
    return "partial";
  }

  return "failed";
}

function resolveTemplateId(
  value?: string | null,
): CommunicationEmailTemplateId {
  return COMMUNICATION_EMAIL_TEMPLATE_IDS.includes(
    value as CommunicationEmailTemplateId,
  )
    ? (value as CommunicationEmailTemplateId)
    : "executive_brief";
}

function getTemplateDisplayName(templateId: string) {
  switch (resolveTemplateId(templateId)) {
    case "event_spotlight":
      return "Event Spotlight";
    case "minimal_notice":
      return "Minimal Notice";
    default:
      return "Executive Brief";
  }
}

function sanitizeDraftFilters(
  input: Record<string, unknown> | null | undefined,
): CommunicationAudienceFilters {
  if (!input) {
    return {};
  }

  return {
    ...(typeof input.eventId === "string" && input.eventId
      ? { eventId: input.eventId }
      : {}),
    ...(typeof input.status === "string" &&
    ["all", "pending", "approved", "rejected", "checked_in"].includes(
      input.status,
    )
      ? { status: input.status as RegistrationStatusFilter }
      : {}),
    ...(typeof input.participantType === "string" &&
    ["all", "participant", "exhibitor"].includes(input.participantType)
      ? { participantType: input.participantType as ParticipantTypeFilter }
      : {}),
    ...(typeof input.companyId === "string" && input.companyId
      ? { companyId: input.companyId }
      : {}),
    ...(typeof input.industryId === "string" && input.industryId
      ? { industryId: input.industryId }
      : {}),
    ...(typeof input.jobTitleId === "string" && input.jobTitleId
      ? { jobTitleId: input.jobTitleId }
      : {}),
    ...(typeof input.cityId === "string" && input.cityId
      ? { cityId: input.cityId }
      : {}),
    ...(typeof input.sourceChannelCode === "string" && input.sourceChannelCode
      ? { sourceChannelCode: input.sourceChannelCode }
      : {}),
    ...(typeof input.search === "string" && input.search.trim()
      ? { search: input.search.trim() }
      : {}),
  };
}

type PopulatedCommunicationCampaign = {
  _id: Types.ObjectId;
  status: CampaignStatus;
  templateId: string;
  previewText?: string | null;
  subject: string;
  bodyHtml: string;
  bodyText?: string | null;
  bodyJson?: Record<string, unknown> | null;
  filtersSnapshot?: Record<string, unknown>;
  audience: {
    recipientCount: number;
    recipients: Array<{
      registrationId: Types.ObjectId;
      participantId: Types.ObjectId;
      email: string;
      name: string;
    }>;
  };
  delivery: CampaignDelivery;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date | null;
  eventId:
    | {
        _id: Types.ObjectId;
        title: string;
        eventDate: Date;
      }
    | null
    | Types.ObjectId;
};

type PopulatedCommunicationCampaignHistory = Omit<
  PopulatedCommunicationCampaign,
  "createdBy"
> & {
  createdBy:
    | {
        _id: Types.ObjectId;
        name: string;
        email: string;
      }
    | Types.ObjectId
    | null;
};

function serializeCommunicationDraft(
  campaign: PopulatedCommunicationCampaign,
): CommunicationDraftDetail {
  const eventDocument =
    campaign.eventId &&
    typeof campaign.eventId === "object" &&
    !(campaign.eventId instanceof Types.ObjectId) &&
    "_id" in campaign.eventId
      ? campaign.eventId
      : null;

  const event = eventDocument
    ? {
        id: eventDocument._id.toString(),
        title: eventDocument.title,
        eventDate: eventDocument.eventDate.toISOString(),
      }
    : {
        id: null,
        title: null,
        eventDate: null,
      };

  return {
    id: campaign._id.toString(),
    status: "draft",
    subject: campaign.subject,
    previewText: campaign.previewText ?? null,
    templateId: resolveTemplateId(campaign.templateId),
    updatedAt: campaign.updatedAt.toISOString(),
    recipientCount: campaign.audience.recipientCount,
    event,
    bodyHtml: campaign.bodyHtml,
    bodyText: campaign.bodyText ?? null,
    bodyJson: campaign.bodyJson ?? null,
    filters: sanitizeDraftFilters(campaign.filtersSnapshot),
    recipientRegistrationIds: campaign.audience.recipients.map((recipient) =>
      recipient.registrationId.toString(),
    ),
  };
}

function serializeCommunicationCampaignHistory(
  campaign: PopulatedCommunicationCampaignHistory,
): CommunicationCampaignHistoryItem {
  const eventDocument =
    campaign.eventId &&
    typeof campaign.eventId === "object" &&
    !(campaign.eventId instanceof Types.ObjectId) &&
    "_id" in campaign.eventId
      ? campaign.eventId
      : null;

  const createdByDocument =
    campaign.createdBy &&
    typeof campaign.createdBy === "object" &&
    !(campaign.createdBy instanceof Types.ObjectId) &&
    "_id" in campaign.createdBy
      ? campaign.createdBy
      : null;

  return {
    id: campaign._id.toString(),
    status: campaign.status,
    templateId: resolveTemplateId(campaign.templateId),
    templateName: getTemplateDisplayName(campaign.templateId),
    previewText: campaign.previewText ?? null,
    subject: campaign.subject,
    recipientCount: campaign.audience.recipientCount,
    delivery: campaign.delivery,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    sentAt: campaign.sentAt ? campaign.sentAt.toISOString() : null,
    event: eventDocument
      ? {
          id: eventDocument._id.toString(),
          title: eventDocument.title,
          eventDate: eventDocument.eventDate.toISOString(),
        }
      : {
          id: null,
          title: null,
          eventDate: null,
        },
    createdBy: createdByDocument
      ? {
          id: createdByDocument._id.toString(),
          name: createdByDocument.name,
          email: createdByDocument.email,
        }
      : null,
  };
}

type PopulatedRegistration = {
  _id: Types.ObjectId;
  status: string;
  participantType: string;
  companySnapshot?: { companyId?: Types.ObjectId | null; name?: string | null };
  industrySnapshot?: { refId?: Types.ObjectId | null; name?: string | null };
  jobTitleSnapshot?: { refId?: Types.ObjectId | null; name?: string | null };
  citySnapshot?: { refId?: Types.ObjectId | null; name?: string | null };
  participantId: {
    _id: Types.ObjectId;
    fullName: string;
    personalEmail?: string | null;
    companyEmail?: string | null;
    sourceChannel?: { code?: string | null; otherText?: string | null } | null;
    company?: {
      companyId?: Types.ObjectId | null;
      name?: string | null;
    } | null;
    industry?: { refId?: Types.ObjectId | null; name?: string | null } | null;
    jobTitle?: { refId?: Types.ObjectId | null; name?: string | null } | null;
    city?: { refId?: Types.ObjectId | null; name?: string | null } | null;
  } | null;
  eventId: {
    _id: Types.ObjectId;
    title: string;
    eventDate: Date;
    status: string;
  } | null;
};

function toAudienceRecipient(
  record: PopulatedRegistration,
): CommunicationAudienceRecipient | null {
  if (!record.participantId || !record.eventId) {
    return null;
  }

  const email = pickRecipientEmail(record.participantId);

  if (!email) {
    return null;
  }

  return {
    registrationId: record._id.toString(),
    participantId: record.participantId._id.toString(),
    eventId: record.eventId._id.toString(),
    eventTitle: record.eventId.title,
    eventDate: record.eventId.eventDate.toISOString(),
    fullName: record.participantId.fullName,
    email,
    participantType: record.participantType,
    status: record.status,
    companyName:
      record.companySnapshot?.name ??
      record.participantId.company?.name ??
      null,
    industryName:
      record.industrySnapshot?.name ??
      record.participantId.industry?.name ??
      null,
    jobTitleName:
      record.jobTitleSnapshot?.name ??
      record.participantId.jobTitle?.name ??
      null,
    cityName:
      record.citySnapshot?.name ?? record.participantId.city?.name ?? null,
    sourceChannelCode: record.participantId.sourceChannel?.code ?? null,
  };
}

function matchesAudienceFilters(
  recipient: CommunicationAudienceRecipient,
  filters: CommunicationAudienceFilters,
  registrationLookups: Record<
    string,
    {
      companyId: string | null;
      industryId: string | null;
      jobTitleId: string | null;
      cityId: string | null;
    }
  >,
) {
  if (
    filters.status &&
    filters.status !== "all" &&
    recipient.status !== filters.status
  ) {
    return false;
  }

  if (
    filters.participantType &&
    filters.participantType !== "all" &&
    recipient.participantType !== filters.participantType
  ) {
    return false;
  }

  const lookup = registrationLookups[recipient.registrationId];

  if (filters.companyId && lookup?.companyId !== filters.companyId) {
    return false;
  }

  if (filters.industryId && lookup?.industryId !== filters.industryId) {
    return false;
  }

  if (filters.jobTitleId && lookup?.jobTitleId !== filters.jobTitleId) {
    return false;
  }

  if (filters.cityId && lookup?.cityId !== filters.cityId) {
    return false;
  }

  if (
    filters.sourceChannelCode &&
    recipient.sourceChannelCode !== filters.sourceChannelCode
  ) {
    return false;
  }

  const normalizedSearch = normalizeSearchValue(filters.search);

  if (!normalizedSearch) {
    return true;
  }

  const searchableText = [
    recipient.fullName,
    recipient.email,
    recipient.companyName,
    recipient.industryName,
    recipient.jobTitleName,
    recipient.cityName,
    recipient.eventTitle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedSearch);
}

async function loadRegistrationAudience(eventId?: string) {
  const match =
    eventId && Types.ObjectId.isValid(eventId)
      ? { eventId: new Types.ObjectId(eventId) }
      : {};

  const registrations = (await Registration.find(match)
    .populate(
      "participantId",
      "fullName personalEmail companyEmail sourceChannel company industry jobTitle city",
    )
    .populate("eventId", "title eventDate status")
    .sort({ createdAt: -1 })
    .lean()) as unknown as PopulatedRegistration[];

  const recipients = registrations
    .map(toAudienceRecipient)
    .filter((item): item is CommunicationAudienceRecipient => Boolean(item));

  const registrationLookups = Object.fromEntries(
    registrations.map((record) => [
      record._id.toString(),
      {
        companyId:
          (
            record.companySnapshot?.companyId ??
            record.participantId?.company?.companyId
          )?.toString() ?? null,
        industryId:
          (
            record.industrySnapshot?.refId ??
            record.participantId?.industry?.refId
          )?.toString() ?? null,
        jobTitleId:
          (
            record.jobTitleSnapshot?.refId ??
            record.participantId?.jobTitle?.refId
          )?.toString() ?? null,
        cityId:
          (
            record.citySnapshot?.refId ?? record.participantId?.city?.refId
          )?.toString() ?? null,
      },
    ]),
  );

  return { recipients, registrationLookups };
}

async function loadUnregisteredParticipants() {
  const participants = (await Participant.find()
    .populate("company", "companyId name")
    .populate("industry", "refId name")
    .populate("jobTitle", "refId name")
    .populate("city", "refId name")
    .sort({ fullName: 1 })
    .lean()) as any[];

  const recipients = participants
    .map((participant) => {
      const email = pickRecipientEmail(participant);
      if (!email) return null;

      return {
        registrationId: participant._id.toString(),
        participantId: participant._id.toString(),
        eventId: "",
        eventTitle: "",
        eventDate: "",
        fullName: participant.fullName,
        email,
        participantType: "participant",
        status: "unregistered",
        companyName: participant.company?.name ?? null,
        industryName: participant.industry?.name ?? null,
        jobTitleName: participant.jobTitle?.name ?? null,
        cityName: participant.city?.name ?? null,
        sourceChannelCode: participant.sourceChannel?.code ?? null,
      };
    })
    .filter((item): item is CommunicationAudienceRecipient => Boolean(item));

  const participantLookups: Record<
    string,
    {
      companyId: string | null;
      industryId: string | null;
      jobTitleId: string | null;
      cityId: string | null;
    }
  > = Object.fromEntries(
    participants.map((participant) => [
      participant._id.toString(),
      {
        companyId: participant.company?.companyId?.toString() ?? null,
        industryId: participant.industry?.refId?.toString() ?? null,
        jobTitleId: participant.jobTitle?.refId?.toString() ?? null,
        cityId: participant.city?.refId?.toString() ?? null,
      },
    ]),
  );

  return { recipients, participantLookups };
}

async function getCampaignRecipients(registrationIds: string[]) {
  const validRegistrationIds = registrationIds
    .filter((value) => Types.ObjectId.isValid(value))
    .map((value) => new Types.ObjectId(value));

  if (validRegistrationIds.length === 0) {
    return [];
  }

  const registrations = (await Registration.find({
    _id: { $in: validRegistrationIds },
  })
    .populate("participantId", "fullName personalEmail companyEmail")
    .populate("eventId", "title eventDate status")
    .lean()) as unknown as PopulatedRegistration[];

  return registrations
    .map(toAudienceRecipient)
    .filter((item): item is CommunicationAudienceRecipient => Boolean(item));
}

async function loadEventSummary(eventId?: string | null) {
  const objectId = toObjectId(eventId);

  if (!objectId) {
    return null;
  }

  const event = await Event.findById(objectId).select("title eventDate").lean();

  if (!event) {
    return null;
  }

  return {
    id: event._id.toString(),
    title: event.title,
    eventDate: event.eventDate.toISOString(),
  };
}

export async function getCommunicationAudience(
  filters: CommunicationAudienceFilters,
): Promise<CommunicationAudienceResponse> {
  const events = await Event.find()
    .select("title eventDate status")
    .sort({ eventDate: -1 })
    .lean();

  const eventOptions = events.map((event) => ({
    id: event._id.toString(),
    title: event.title,
    eventDate: event.eventDate.toISOString(),
    status: event.status,
  }));

  // If eventId is provided, use registered participants for that event
  // If eventId is NOT provided, use all participants from the database
  let allRecipients: CommunicationAudienceRecipient[] = [];
  let lookups: Record<
    string,
    {
      companyId: string | null;
      industryId: string | null;
      jobTitleId: string | null;
      cityId: string | null;
    }
  > = {};

  if (filters.eventId) {
    // Show registered participants for specific event
    const { recipients: eventRecipients, registrationLookups } =
      await loadRegistrationAudience(filters.eventId);
    allRecipients = eventRecipients;
    lookups = registrationLookups;
  } else {
    // Show all participants (unregistered)
    const { recipients: participantRecipients, participantLookups } =
      await loadUnregisteredParticipants();
    allRecipients = participantRecipients;
    lookups = participantLookups;
  }

  const filteredRecipients = allRecipients
    .filter((recipient) => matchesAudienceFilters(recipient, filters, lookups))
    .toSorted((left, right) => left.fullName.localeCompare(right.fullName));

  // Base recipients for building filter options
  const baseRecipients = filters.eventId
    ? allRecipients.filter((recipient) => recipient.eventId === filters.eventId)
    : allRecipients;

  const summaryRecipients = baseRecipients.filter((recipient) =>
    matchesAudienceFilters(
      recipient,
      {
        ...filters,
        status: "all",
      },
      lookups,
    ),
  );

  const companies = sortByLabel(
    dedupeByKey(
      baseRecipients
        .map((recipient) => ({
          id: lookups[recipient.registrationId]?.companyId ?? "",
          label: recipient.companyName ?? "",
        }))
        .filter((item) => item.id && item.label),
      (item) => item.id,
    ),
  );

  const industries = sortByLabel(
    dedupeByKey(
      baseRecipients
        .map((recipient) => ({
          id: lookups[recipient.registrationId]?.industryId ?? "",
          label: recipient.industryName ?? "",
        }))
        .filter((item) => item.id && item.label),
      (item) => item.id,
    ),
  );

  const jobTitles = sortByLabel(
    dedupeByKey(
      baseRecipients
        .map((recipient) => ({
          id: lookups[recipient.registrationId]?.jobTitleId ?? "",
          label: recipient.jobTitleName ?? "",
        }))
        .filter((item) => item.id && item.label),
      (item) => item.id,
    ),
  );

  const cities = sortByLabel(
    dedupeByKey(
      baseRecipients
        .map((recipient) => ({
          id: lookups[recipient.registrationId]?.cityId ?? "",
          label: recipient.cityName ?? "",
        }))
        .filter((item) => item.id && item.label),
      (item) => item.id,
    ),
  );

  const sourceChannels = Array.from(
    new Set(
      baseRecipients
        .map((recipient) => recipient.sourceChannelCode)
        .filter((value): value is string => Boolean(value)),
    ),
  ).toSorted();

  return {
    events: eventOptions,
    recipients: filteredRecipients,
    filterOptions: {
      companies,
      industries,
      jobTitles,
      cities,
      sourceChannels,
    },
    summary: {
      totalRecipients: filteredRecipients.length,
      statusCounts: buildStatusCounts(summaryRecipients),
    },
  };
}

export async function previewCommunicationCampaign(
  input: PreviewCommunicationCampaignInput,
): Promise<CommunicationCampaignPreview> {
  const sampleRecipient = input.sampleRegistrationId
    ? ((await getCampaignRecipients([input.sampleRegistrationId]))[0] ?? null)
    : null;

  const fallbackEvent = await loadEventSummary(input.eventId);
  const templateId = resolveTemplateId(input.templateId);
  const rendered = renderCommunicationEmail({
    templateId,
    subject: input.subject.trim() || "Tanpa subject",
    bodyHtml: input.bodyHtml,
    bodyText: input.bodyText ?? stripHtml(input.bodyHtml),
    recipientName: sampleRecipient?.fullName ?? "Participant Preview",
    recipientEmail: sampleRecipient?.email ?? "participant@example.com",
    eventTitle: sampleRecipient?.eventTitle ?? fallbackEvent?.title ?? null,
    eventDate: sampleRecipient?.eventDate ?? fallbackEvent?.eventDate ?? null,
    ...(input.previewText !== undefined
      ? { previewText: input.previewText }
      : {}),
  });

  return {
    templateId,
    templateName: rendered.template.name,
    previewText: rendered.previewText,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    from: {
      name: env.mailFromName,
      email: env.mailFromEmail,
    },
    sampleRecipient: {
      name: sampleRecipient?.fullName ?? "Participant Preview",
      email: sampleRecipient?.email ?? "participant@example.com",
    },
    event: {
      id: sampleRecipient?.eventId ?? fallbackEvent?.id ?? null,
      title: sampleRecipient?.eventTitle ?? fallbackEvent?.title ?? null,
      eventDate: sampleRecipient?.eventDate ?? fallbackEvent?.eventDate ?? null,
    },
  };
}

export async function listCommunicationDrafts(createdByUserId: string) {
  const createdBy = toObjectId(createdByUserId);

  if (!createdBy) {
    throw new Error("Pengguna draft tidak valid.");
  }

  const drafts = (await CommunicationCampaign.find({
    createdBy,
    status: "draft",
  })
    .populate("eventId", "title eventDate")
    .sort({ updatedAt: -1 })
    .limit(8)
    .lean()) as unknown as PopulatedCommunicationCampaign[];

  return drafts.map(serializeCommunicationDraft);
}

export async function getCommunicationDraftDetail(
  createdByUserId: string,
  draftId: string,
) {
  const createdBy = toObjectId(createdByUserId);
  const draftObjectId = toObjectId(draftId);

  if (!createdBy || !draftObjectId) {
    throw new Error("Draft yang diminta tidak valid.");
  }

  const draft = (await CommunicationCampaign.findOne({
    _id: draftObjectId,
    createdBy,
    status: "draft",
  })
    .populate("eventId", "title eventDate")
    .lean()) as unknown as PopulatedCommunicationCampaign | null;

  if (!draft) {
    throw new Error("Draft tidak ditemukan atau sudah tidak aktif.");
  }

  return serializeCommunicationDraft(draft);
}

export async function listCommunicationCampaignHistory(
  filters: CommunicationCampaignHistoryFilters,
): Promise<CommunicationCampaignHistoryResponse> {
  const match =
    filters.status && filters.status !== "all"
      ? { status: filters.status }
      : {};

  const normalizedSearch = normalizeSearchValue(filters.search);

  const campaigns = (await CommunicationCampaign.find(match)
    .populate("eventId", "title eventDate")
    .populate("createdBy", "name email")
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean()) as unknown as PopulatedCommunicationCampaignHistory[];

  const items = campaigns
    .map(serializeCommunicationCampaignHistory)
    .filter((campaign) => {
      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        campaign.subject,
        campaign.previewText,
        campaign.event.title,
        campaign.createdBy?.name,
        campaign.createdBy?.email,
        campaign.templateName,
        campaign.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });

  const statusCounts = items.reduce<Record<string, number>>(
    (result, campaign) => {
      result.all = (result.all ?? 0) + 1;
      result[campaign.status] = (result[campaign.status] ?? 0) + 1;
      return result;
    },
    {},
  );

  return {
    items,
    summary: {
      total: items.length,
      statusCounts,
    },
  };
}

export async function createCommunicationCampaign(
  input: CreateCommunicationCampaignInput,
) {
  const createdBy = toObjectId(input.createdByUserId);

  if (!createdBy) {
    throw new Error("Pengguna pengirim tidak valid.");
  }

  const recipients = await getCampaignRecipients(
    input.recipientRegistrationIds,
  );

  if (input.mode === "send" && recipients.length === 0) {
    throw new Error("Pilih minimal satu penerima email untuk dikirim.");
  }

  const bodyHtml = input.bodyHtml.trim();
  const subject = input.subject.trim();
  const bodyText = input.bodyText?.trim() || stripHtml(bodyHtml);
  const templateId = resolveTemplateId(input.templateId);
  const previewText = input.previewText?.trim() || null;

  if (input.mode === "send" && !subject) {
    throw new Error("Subject email wajib diisi sebelum broadcast.");
  }

  if (input.mode === "send" && !bodyText) {
    throw new Error("Isi email masih kosong.");
  }

  const initialStatus: CampaignStatus =
    input.mode === "send" ? "queued" : "draft";
  const draftObjectId = toObjectId(input.draftId);
  const existingDraft =
    draftObjectId &&
    (await CommunicationCampaign.findOne({
      _id: draftObjectId,
      createdBy,
      status: "draft",
    }));

  if (input.draftId && !existingDraft) {
    throw new Error("Draft tidak ditemukan atau sudah tidak aktif.");
  }

  const campaignPayload = {
    eventId: toObjectId(input.eventId),
    createdBy,
    sentBy: input.mode === "send" ? createdBy : null,
    status: initialStatus,
    templateId,
    previewText,
    subject,
    bodyHtml,
    bodyText: bodyText || null,
    bodyJson: input.bodyJson ?? null,
    filtersSnapshot: (input.filters ?? {}) as Record<string, unknown>,
    audience: {
      recipientCount: recipients.length,
      recipients: recipients.map((recipient) => ({
        registrationId: new Types.ObjectId(recipient.registrationId),
        participantId: new Types.ObjectId(recipient.participantId),
        email: recipient.email,
        name: recipient.fullName,
      })),
    },
    delivery: getEmptyDelivery(),
    sentAt: null,
  };

  const campaign = existingDraft
    ? await CommunicationCampaign.findByIdAndUpdate(
        existingDraft._id,
        {
          $set: campaignPayload,
        },
        { returnDocument: "after" },
      )
    : await CommunicationCampaign.create(campaignPayload);

  if (!campaign) {
    throw new Error("Campaign email gagal disimpan.");
  }

  if (input.mode === "send") {
    try {
      await enqueueCommunicationCampaignJob({
        campaignId: campaign._id.toString(),
      });
    } catch (error) {
      if (existingDraft) {
        await CommunicationCampaign.findByIdAndUpdate(campaign._id, {
          $set: {
            status: "draft",
            sentBy: null,
            sentAt: null,
            delivery: getEmptyDelivery(),
          },
        });
      } else {
        await CommunicationCampaign.findByIdAndUpdate(campaign._id, {
          $set: {
            status: "failed",
          },
        });
      }

      throw new Error(
        error instanceof Error
          ? `RabbitMQ gagal menerima campaign: ${error.message}${
              existingDraft ? " Draft tetap tersimpan untuk dicoba lagi." : ""
            }`
          : "RabbitMQ gagal menerima campaign.",
      );
    }
  }

  return {
    id: campaign._id.toString(),
    status: initialStatus,
    recipientCount: recipients.length,
    delivery: getEmptyDelivery(),
    message:
      input.mode === "draft"
        ? existingDraft
          ? "Draft email berhasil diperbarui."
          : "Draft email berhasil disimpan."
        : "Broadcast email berhasil masuk ke antrian RabbitMQ. Delivery diproses di background.",
  };
}

export async function processQueuedCommunicationCampaign(campaignId: string) {
  const objectId = toObjectId(campaignId);

  if (!objectId) {
    console.warn(`[QUEUE] Skip invalid campaign id: ${campaignId}`);
    return;
  }

  const campaign = await CommunicationCampaign.findOneAndUpdate(
    {
      _id: objectId,
      status: "queued",
    },
    {
      $set: {
        status: "processing",
        delivery: getEmptyDelivery(),
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (!campaign) {
    const existingCampaign = await CommunicationCampaign.findById(objectId)
      .select("status")
      .lean();

    if (existingCampaign) {
      console.log(
        `[QUEUE] Campaign ${campaignId} skipped because status is already ${existingCampaign.status}.`,
      );
    }

    return;
  }

  const recipients = dedupeByKey(
    campaign.audience.recipients.map((recipient) => ({
      email: recipient.email,
      name: recipient.name,
      registrationId: recipient.registrationId.toString(),
      participantId: recipient.participantId.toString(),
    })),
    (recipient) => recipient.email.toLowerCase(),
  );

  if (recipients.length === 0) {
    await CommunicationCampaign.findByIdAndUpdate(campaign._id, {
      $set: {
        status: "failed",
        sentAt: new Date(),
      },
    });
    return;
  }

  const event = campaign.eventId
    ? await Event.findById(campaign.eventId).select("title eventDate").lean()
    : null;

  const delivery = getEmptyDelivery();

  for (const recipient of recipients) {
    try {
      const rendered = renderCommunicationEmail({
        templateId: resolveTemplateId(campaign.templateId),
        previewText: campaign.previewText,
        subject: campaign.subject,
        bodyHtml: campaign.bodyHtml,
        bodyText: campaign.bodyText,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        eventTitle: event?.title ?? null,
        eventDate: event?.eventDate ?? null,
      });

      await sendEmailMessage({
        to: recipient.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        attachments: [getYorindoLogoAttachment()],
      });

      delivery.successCount += 1;
    } catch (error) {
      delivery.failures.push({
        email: recipient.email,
        reason:
          error instanceof Error
            ? error.message
            : "Unknown background delivery error.",
      });
    }
  }

  delivery.failureCount = delivery.failures.length;

  await CommunicationCampaign.findByIdAndUpdate(campaign._id, {
    $set: {
      status: buildCampaignStatus(delivery),
      delivery,
      sentAt: new Date(),
    },
  });
}
