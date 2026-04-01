import { Types } from "mongoose";
import {
  CommunicationCampaign,
  Event,
  Registration,
} from "../models/index.ts";
import { sendCampaignEmail } from "./email.service.ts";

type RegistrationStatusFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "checked_in";

type ParticipantTypeFilter = "all" | "participant" | "exhibitor";

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
  eventId?: string | null;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  bodyJson?: unknown | null;
  filters?: CommunicationAudienceFilters;
  recipientRegistrationIds: string[];
  createdByUserId: string;
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
  return participant.companyEmail?.trim() || participant.personalEmail?.trim() || null;
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
  const counts = recipients.reduce<Record<string, number>>((result, recipient) => {
    result.all = (result.all ?? 0) + 1;
    result[recipient.status] = (result[recipient.status] ?? 0) + 1;
    return result;
  }, {});

  return counts;
}

type PopulatedRegistration = {
  _id: Types.ObjectId;
  status: string;
  participantType: string;
  companySnapshot?: { companyId?: Types.ObjectId | null; name?: string | null };
  industrySnapshot?: { refId?: Types.ObjectId | null; name?: string | null };
  jobTitleSnapshot?: { refId?: Types.ObjectId | null; name?: string | null };
  citySnapshot?: { refId?: Types.ObjectId | null; name?: string | null };
  participantId:
    | {
        _id: Types.ObjectId;
        fullName: string;
        personalEmail?: string | null;
        companyEmail?: string | null;
        sourceChannel?: { code?: string | null; otherText?: string | null } | null;
      }
    | null;
  eventId:
    | {
        _id: Types.ObjectId;
        title: string;
        eventDate: Date;
        status: string;
      }
    | null;
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
    companyName: record.companySnapshot?.name ?? null,
    industryName: record.industrySnapshot?.name ?? null,
    jobTitleName: record.jobTitleSnapshot?.name ?? null,
    cityName: record.citySnapshot?.name ?? null,
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
  if (filters.status && filters.status !== "all" && recipient.status !== filters.status) {
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
    .populate("participantId", "fullName personalEmail companyEmail sourceChannel")
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
        companyId: record.companySnapshot?.companyId?.toString() ?? null,
        industryId: record.industrySnapshot?.refId?.toString() ?? null,
        jobTitleId: record.jobTitleSnapshot?.refId?.toString() ?? null,
        cityId: record.citySnapshot?.refId?.toString() ?? null,
      },
    ]),
  );

  return { recipients, registrationLookups };
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

  const { recipients: eventRecipients, registrationLookups } =
    await loadRegistrationAudience(filters.eventId);

  const filteredRecipients = eventRecipients
    .filter((recipient) =>
      matchesAudienceFilters(recipient, filters, registrationLookups),
    )
    .toSorted((left, right) => left.fullName.localeCompare(right.fullName));

  const baseRecipients = filters.eventId
    ? eventRecipients.filter((recipient) => recipient.eventId === filters.eventId)
    : eventRecipients;
  const summaryRecipients = baseRecipients.filter((recipient) =>
    matchesAudienceFilters(
      recipient,
      {
        ...filters,
        status: "all",
      },
      registrationLookups,
    ),
  );

  const companies = sortByLabel(
    dedupeByKey(
      baseRecipients
        .map((recipient) => ({
          id: registrationLookups[recipient.registrationId]?.companyId ?? "",
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
          id: registrationLookups[recipient.registrationId]?.industryId ?? "",
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
          id: registrationLookups[recipient.registrationId]?.jobTitleId ?? "",
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
          id: registrationLookups[recipient.registrationId]?.cityId ?? "",
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

export async function createCommunicationCampaign(
  input: CreateCommunicationCampaignInput,
) {
  const createdBy = toObjectId(input.createdByUserId);

  if (!createdBy) {
    throw new Error("Pengguna pengirim tidak valid.");
  }

  const recipients = await getCampaignRecipients(input.recipientRegistrationIds);

  if (input.mode === "send" && recipients.length === 0) {
    throw new Error("Pilih minimal satu penerima email untuk dikirim.");
  }

  const bodyHtml = input.bodyHtml.trim();
  const subject = input.subject.trim();
  const bodyText = input.bodyText?.trim() || stripHtml(bodyHtml);

  if (input.mode === "send" && !subject) {
    throw new Error("Subject email wajib diisi sebelum broadcast.");
  }

  if (input.mode === "send" && !bodyText) {
    throw new Error("Isi email masih kosong.");
  }

  let status: "draft" | "sent" | "partial" | "failed" = "draft";
  let sentAt: Date | null = null;
  let delivery = {
    successCount: 0,
    failureCount: 0,
    failures: [] as Array<{ email: string; reason: string }>,
  };

  if (input.mode === "send") {
    sentAt = new Date();
    delivery = await sendCampaignEmail({
      recipients: recipients.map((recipient) => ({
        email: recipient.email,
        name: recipient.fullName,
      })),
      subject,
      html: bodyHtml,
      text: bodyText,
    });

    if (delivery.successCount > 0 && delivery.failureCount === 0) {
      status = "sent";
    } else if (delivery.successCount > 0) {
      status = "partial";
    } else {
      status = "failed";
    }
  }

  const campaign = await CommunicationCampaign.create({
    eventId: toObjectId(input.eventId),
    createdBy,
    sentBy: input.mode === "send" ? createdBy : null,
    status,
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
    delivery,
    sentAt,
  });

  return {
    id: campaign._id.toString(),
    status,
    recipientCount: recipients.length,
    delivery,
    message:
      input.mode === "draft"
        ? "Draft email berhasil disimpan."
        : status === "sent"
          ? "Broadcast email berhasil dikirim."
          : status === "partial"
            ? "Broadcast email terkirim sebagian. Cek daftar kegagalan."
            : "Broadcast email gagal dikirim.",
  };
}
