import { Types } from "mongoose";
import { Event, Registration } from "../models/index.ts";
import { verifyRegistrationTicket } from "../utils/jwt.ts";

type CheckInOutcome = "checked_in" | "already_checked_in";

type CheckInRegistrationItem = {
  _id: string;
  eventId: string;
  participantId: string;
  participantType: string;
  status: string;
  approval: {
    approvedBy: string | null;
    approvedAt: Date | null;
    rejectedBy: string | null;
    rejectedAt: Date | null;
    rejectionReason: string | null;
  };
  companySnapshot: { name: string | null };
  industrySnapshot: { name: string | null };
  jobTitleSnapshot: { name: string | null };
  citySnapshot: { name: string | null };
  ticket: {
    qrCode: string;
    qrPayload?: string;
    issuedAt: Date;
    reissueCount: number;
    isActive: boolean;
  } | null;
  ticketDelivery: {
    status: string;
    queuedAt: Date | null;
    lastAttemptAt: Date | null;
    sentAt: Date | null;
    failedAt: Date | null;
    failureReason: string | null;
    attempts: number;
  };
  checkIn: {
    isAttended: boolean;
    checkedInAt: Date | null;
    checkedInBy: string | null;
    scanMethod: string;
    notes: string | null;
  };
  participant: {
    _id: string;
    fullName: string;
    personalEmail: string | null;
    companyEmail: string | null;
  };
};

export class CheckInError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function toObjectId(value: string) {
  return Types.ObjectId.isValid(value)
    ? new Types.ObjectId(value)
    : null;
}

async function getRegistrationListItemById(
  registrationId: Types.ObjectId,
): Promise<CheckInRegistrationItem | null> {
  const result = await Registration.aggregate([
    {
      $match: {
        _id: registrationId,
      },
    },
    {
      $lookup: {
        from: "participants",
        let: { pId: "$participantId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$pId"] } } },
          {
            $project: {
              fullName: 1,
              normalizedFullName: 1,
              personalEmail: 1,
              companyEmail: 1,
              jobTitle: 1,
            },
          },
        ],
        as: "participant",
      },
    },
    { $unwind: "$participant" },
    {
      $project: {
        "participant.normalizedFullName": 0,
      },
    },
  ]);

  return (result[0] as CheckInRegistrationItem | undefined) ?? null;
}

async function getEventSummary(eventId: Types.ObjectId) {
  return Event.findById(eventId)
    .select("title eventDate location status")
    .lean();
}

async function applyCheckIn(params: {
  eventId: Types.ObjectId;
  registrationId: Types.ObjectId;
  userId: string;
  scanMethod: "qr" | "manual";
  notes?: string;
}) {
  const existing = await Registration.findOne({
    _id: params.registrationId,
    eventId: params.eventId,
    status: { $in: ["approved", "checked_in"] },
  })
    .select("status checkIn")
    .lean();

  if (!existing) {
    throw new CheckInError(
      404,
      "Registration approved untuk event ini tidak ditemukan.",
    );
  }

  if (existing.checkIn?.isAttended || existing.status === "checked_in") {
    const registration = await getRegistrationListItemById(params.registrationId);

    if (!registration) {
      throw new CheckInError(
        404,
        "Registration ditemukan tetapi detail check-in gagal dimuat.",
      );
    }

    return {
      outcome: "already_checked_in" as CheckInOutcome,
      registration,
      message: `${registration.participant.fullName} sudah pernah check-in sebelumnya.`,
    };
  }

  await Registration.findOneAndUpdate(
    {
      _id: params.registrationId,
      eventId: params.eventId,
      status: "approved",
    },
    {
      $set: {
        status: "checked_in",
        "checkIn.isAttended": true,
        "checkIn.checkedInAt": new Date(),
        "checkIn.checkedInBy": new Types.ObjectId(params.userId),
        "checkIn.scanMethod": params.scanMethod,
        "checkIn.notes": params.notes?.trim() || null,
      },
    },
    { returnDocument: "after" },
  ).lean();

  const registration = await getRegistrationListItemById(params.registrationId);

  if (!registration) {
    throw new CheckInError(
      404,
      "Registration berhasil di-check-in tetapi detail gagal dimuat.",
    );
  }

  return {
    outcome: "checked_in" as CheckInOutcome,
    registration,
    message: `${registration.participant.fullName} berhasil check-in.`,
  };
}

export async function getCheckInStats(eventId: string) {
  const eventObjectId = toObjectId(eventId);

  if (!eventObjectId) {
    throw new CheckInError(400, "Event ID tidak valid.");
  }

  const [event, groupedCounts] = await Promise.all([
    getEventSummary(eventObjectId),
    Registration.aggregate([
      {
        $match: {
          eventId: eventObjectId,
          status: { $in: ["approved", "checked_in"] },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  if (!event) {
    throw new CheckInError(404, "Event tidak ditemukan.");
  }

  const approvedCount =
    groupedCounts.find((item) => item._id === "approved")?.count ?? 0;
  const checkedInCount =
    groupedCounts.find((item) => item._id === "checked_in")?.count ?? 0;

  return {
    event: {
      _id: event._id.toString(),
      title: event.title,
      eventDate: event.eventDate,
      location: event.location ?? null,
      status: event.status,
    },
    counts: {
      approvedCount,
      checkedInCount,
      totalReadyCount: approvedCount + checkedInCount,
      remainingCount: approvedCount,
    },
  };
}

export async function getRecentCheckIns(eventId: string, limit: number) {
  const eventObjectId = toObjectId(eventId);

  if (!eventObjectId) {
    throw new CheckInError(400, "Event ID tidak valid.");
  }

  const items = await Registration.aggregate([
    {
      $match: {
        eventId: eventObjectId,
        "checkIn.isAttended": true,
      },
    },
    { $sort: { "checkIn.checkedInAt": -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "participants",
        let: { pId: "$participantId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$pId"] } } },
          {
            $project: {
              fullName: 1,
              personalEmail: 1,
              companyEmail: 1,
              jobTitle: 1,
            },
          },
        ],
        as: "participant",
      },
    },
    { $unwind: "$participant" },
    {
      $project: {
        _id: 1,
        status: 1,
        participantType: 1,
        "participant.fullName": 1,
        "participant.personalEmail": 1,
        "participant.companyEmail": 1,
        "participant.jobTitle.name": 1,
        "companySnapshot.name": 1,
        "jobTitleSnapshot.name": 1,
        "checkIn.checkedInAt": 1,
        "checkIn.scanMethod": 1,
      },
    },
  ]);

  return { items };
}

export async function lookupCheckInCandidates(
  eventId: string,
  search: string,
  limit: number,
) {
  const eventObjectId = toObjectId(eventId);

  if (!eventObjectId) {
    throw new CheckInError(400, "Event ID tidak valid.");
  }

  const safeSearch = search.trim();

  if (!safeSearch) {
    return { items: [] };
  }

  const items = await Registration.aggregate([
    {
      $match: {
        eventId: eventObjectId,
        status: { $in: ["approved", "checked_in"] },
      },
    },
    {
      $lookup: {
        from: "participants",
        let: { pId: "$participantId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$pId"] } } },
          {
            $project: {
              fullName: 1,
              normalizedFullName: 1,
              personalEmail: 1,
              companyEmail: 1,
              jobTitle: 1,
            },
          },
        ],
        as: "participant",
      },
    },
    { $unwind: "$participant" },
    {
      $match: {
        $or: [
          { "participant.normalizedFullName": { $regex: safeSearch, $options: "i" } },
          { "participant.personalEmail": { $regex: safeSearch, $options: "i" } },
          { "participant.companyEmail": { $regex: safeSearch, $options: "i" } },
          { "companySnapshot.name": { $regex: safeSearch, $options: "i" } },
          { "ticket.qrCode": { $regex: safeSearch, $options: "i" } },
        ],
      },
    },
    { $sort: { status: 1, createdAt: -1 } },
    { $limit: limit },
    {
      $project: {
        "participant.normalizedFullName": 0,
      },
    },
  ]);

  return { items };
}

export async function scanCheckIn(
  eventId: string,
  qrPayload: string,
  userId: string,
) {
  const eventObjectId = toObjectId(eventId);

  if (!eventObjectId) {
    throw new CheckInError(400, "Event ID tidak valid.");
  }

  const rawValue = qrPayload.trim();

  if (!rawValue) {
    throw new CheckInError(400, "QR payload tidak boleh kosong.");
  }

  let registrationId: Types.ObjectId | null = null;
  let qrCode = rawValue;

  try {
    const decoded = verifyRegistrationTicket(rawValue);

    if (decoded.eventId !== eventId) {
      throw new CheckInError(
        409,
        "QR ticket ini terdaftar untuk event yang berbeda.",
      );
    }

    registrationId = toObjectId(decoded.sub);
    qrCode = decoded.qrCode;

    if (!registrationId) {
      throw new CheckInError(400, "Registration ID pada QR ticket tidak valid.");
    }
  } catch (error) {
    if (error instanceof CheckInError) {
      throw error;
    }
  }

  let registration: { _id: Types.ObjectId } | null = null;

  if (registrationId) {
    registration = await Registration.findOne({
      _id: registrationId,
      eventId: eventObjectId,
      status: { $in: ["approved", "checked_in"] },
      "ticket.isActive": true,
      "ticket.qrCode": qrCode,
    })
      .select("_id")
      .lean();
  }

  if (!registration) {
    registration = await Registration.findOne({
      eventId: eventObjectId,
      status: { $in: ["approved", "checked_in"] },
      "ticket.isActive": true,
      "ticket.qrCode": rawValue,
    })
      .select("_id")
      .lean();
  }

  if (!registration) {
    throw new CheckInError(
      404,
      "QR ticket tidak valid, tidak aktif, atau tidak terdaftar untuk event ini.",
    );
  }

  return applyCheckIn({
    eventId: eventObjectId,
    registrationId: registration._id,
    userId,
    scanMethod: "qr",
  });
}

export async function manualCheckIn(params: {
  eventId: string;
  registrationId: string;
  userId: string;
  notes?: string;
}) {
  const eventObjectId = toObjectId(params.eventId);
  const registrationObjectId = toObjectId(params.registrationId);

  if (!eventObjectId || !registrationObjectId) {
    throw new CheckInError(400, "Payload manual check-in tidak valid.");
  }

  return applyCheckIn({
    eventId: eventObjectId,
    registrationId: registrationObjectId,
    userId: params.userId,
    scanMethod: "manual",
    ...(params.notes ? { notes: params.notes } : {}),
  });
}
