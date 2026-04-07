/**
 * @file services/registration.service.ts
 * @description Business logic for participant registration management.
 */

import { Types } from "mongoose";
import { Registration } from "../models/index.ts";
import type {
  BulkRejectBody,
  GetRegistrationsQuery,
  RejectBody,
} from "../validators/registration.validators.ts";
import {
  buildRegistrationTicket,
  queueApprovedRegistrationTicketEmails,
  queueRegistrationTicketEmail,
} from "./registration-ticket.service.ts";

interface RegistrationMeta {
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  checkedInCount: number;
  totalCount: number;
}

function buildMeta(groups: { _id: string; count: number }[]): RegistrationMeta {
  const meta: RegistrationMeta = {
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    checkedInCount: 0,
    totalCount: 0,
  };

  for (const { _id, count } of groups) {
    meta.totalCount += count;

    if (_id === "approved") {
      meta.approvedCount = count;
    } else if (_id === "pending") {
      meta.pendingCount = count;
    } else if (_id === "rejected") {
      meta.rejectedCount = count;
    } else if (_id === "checked_in") {
      meta.checkedInCount = count;
    }
  }

  return meta;
}

const registrationSnapshotFallbackStage = {
  $set: {
    companySnapshot: {
      $mergeObjects: [
        { companyId: null, name: null },
        { $ifNull: ["$companySnapshot", {}] },
        {
          companyId: {
            $ifNull: [
              "$companySnapshot.companyId",
              "$participant.company.companyId",
            ],
          },
          name: {
            $ifNull: ["$companySnapshot.name", "$participant.company.name"],
          },
        },
      ],
    },
    industrySnapshot: {
      $mergeObjects: [
        { refId: null, name: null },
        { $ifNull: ["$industrySnapshot", {}] },
        {
          refId: {
            $ifNull: [
              "$industrySnapshot.refId",
              "$participant.industry.refId",
            ],
          },
          name: {
            $ifNull: ["$industrySnapshot.name", "$participant.industry.name"],
          },
        },
      ],
    },
    jobTitleSnapshot: {
      $mergeObjects: [
        { refId: null, name: null },
        { $ifNull: ["$jobTitleSnapshot", {}] },
        {
          refId: {
            $ifNull: [
              "$jobTitleSnapshot.refId",
              "$participant.jobTitle.refId",
            ],
          },
          name: {
            $ifNull: ["$jobTitleSnapshot.name", "$participant.jobTitle.name"],
          },
        },
      ],
    },
    citySnapshot: {
      $mergeObjects: [
        { refId: null, name: null },
        { $ifNull: ["$citySnapshot", {}] },
        {
          refId: {
            $ifNull: [
              "$citySnapshot.refId",
              "$participant.city.refId",
            ],
          },
          name: {
            $ifNull: ["$citySnapshot.name", "$participant.city.name"],
          },
        },
      ],
    },
  },
};

function buildBulkApproveMessage(params: {
  modifiedCount: number;
  queuedCount: number;
  failedQueueCount: number;
}) {
  if (params.modifiedCount === 0) {
    return "Tidak ada registration pending yang dapat di-approve.";
  }

  if (params.failedQueueCount === 0) {
    return `${params.modifiedCount} registration(s) approved. ${params.queuedCount} QR ticket email(s) queued for delivery.`;
  }

  return `${params.modifiedCount} registration(s) approved. ${params.queuedCount} QR ticket email(s) queued, ${params.failedQueueCount} need retry.`;
}

async function getRegistrationListItemById(registrationId: Types.ObjectId) {
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
              company: 1,
              industry: 1,
              jobTitle: 1,
              city: 1,
            },
          },
        ],
        as: "participant",
      },
    },
    { $unwind: "$participant" },
    registrationSnapshotFallbackStage,
    {
      $project: {
        "participant.normalizedFullName": 0,
      },
    },
  ]);

  return result[0] ?? null;
}

export async function getRegistrations(
  eventId: string,
  query: GetRegistrationsQuery,
) {
  const { page, limit, status, sector, search } = query;
  const skip = (page - 1) * limit;

  const baseMatch: Record<string, unknown> = {
    eventId: new Types.ObjectId(eventId),
  };

  if (status) {
    baseMatch.status = status;
  }

  if (sector) {
    baseMatch["industrySnapshot.refId"] = new Types.ObjectId(sector);
  }

  const searchStages = search
    ? [
        {
          $match: {
            $or: [
              {
                "participant.normalizedFullName": {
                  $regex: search,
                  $options: "i",
                },
              },
              {
                "companySnapshot.name": {
                  $regex: search,
                  $options: "i",
                },
              },
            ],
          },
        },
      ]
    : [];

  const [result, statusGroups] = await Promise.all([
    Registration.aggregate([
      { $match: baseMatch },
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
                    company: 1,
                    industry: 1,
                    jobTitle: 1,
                    city: 1,
                  },
                },
              ],
              as: "participant",
            },
          },
          { $unwind: "$participant" },
          registrationSnapshotFallbackStage,
          ...searchStages,
      {
        $facet: {
          items: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            { $project: { "participant.normalizedFullName": 0 } },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]),
    Registration.aggregate([
      { $match: { eventId: new Types.ObjectId(eventId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const items: unknown[] = result[0]?.items ?? [];
  const total: number = result[0]?.total[0]?.count ?? 0;

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    meta: buildMeta(statusGroups),
  };
}

export async function getRegistrationFilters(eventId: string) {
  const eventObjectId = new Types.ObjectId(eventId);

  const [sectors, statuses] = await Promise.all([
    Registration.aggregate([
      { $match: { eventId: eventObjectId } },
      {
        $group: {
          _id: {
            refId: "$industrySnapshot.refId",
            name: "$industrySnapshot.name",
          },
        },
      },
      { $project: { _id: 0, refId: "$_id.refId", name: "$_id.name" } },
      { $sort: { name: 1 } },
    ]),
    Registration.distinct("status", { eventId: eventObjectId }),
  ]);

  return { sectors, statuses };
}

export async function approveRegistration(
  eventId: string,
  registrationId: string,
  userId: string,
) {
  const ticket = buildRegistrationTicket({ registrationId, eventId });
  const updatedRegistration = await Registration.findOneAndUpdate(
    {
      _id: new Types.ObjectId(registrationId),
      eventId: new Types.ObjectId(eventId),
      status: "pending",
    },
    {
      $set: {
        status: "approved",
        "approval.approvedBy": new Types.ObjectId(userId),
        "approval.approvedAt": new Date(),
        ticket,
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!updatedRegistration) {
    return null;
  }

  const ticketDelivery = await queueRegistrationTicketEmail(
    updatedRegistration._id.toString(),
  );
  const registration = await getRegistrationListItemById(updatedRegistration._id);

  if (!registration) {
    throw new Error("Registration berhasil di-approve tetapi gagal dimuat ulang.");
  }

  return {
    registration,
    ticketDelivery,
    message: ticketDelivery.message,
  };
}

export async function rejectRegistration(
  eventId: string,
  registrationId: string,
  userId: string,
  rejectionReason?: RejectBody["rejectionReason"],
) {
  const setFields: Record<string, unknown> = {
    status: "rejected",
    "approval.rejectedBy": new Types.ObjectId(userId),
    "approval.rejectedAt": new Date(),
  };

  if (rejectionReason) {
    setFields["approval.rejectionReason"] = rejectionReason;
  }

  return Registration.findOneAndUpdate(
    {
      _id: new Types.ObjectId(registrationId),
      eventId: new Types.ObjectId(eventId),
      status: "pending",
    },
    { $set: setFields },
    { returnDocument: "after" },
  ).lean();
}

export async function bulkApproveRegistrations(
  eventId: string,
  ids: string[],
  userId: string,
) {
  const eventObjectId = new Types.ObjectId(eventId);
  const userObjectId = new Types.ObjectId(userId);
  const now = new Date();
  const uniqueObjectIds = Array.from(
    new Set(ids.filter((id) => Types.ObjectId.isValid(id))),
  ).map((id) => new Types.ObjectId(id));

  if (uniqueObjectIds.length === 0) {
    return {
      modifiedCount: 0,
      queuedCount: 0,
      failedQueueCount: 0,
      queueFailures: [],
      message: buildBulkApproveMessage({
        modifiedCount: 0,
        queuedCount: 0,
        failedQueueCount: 0,
      }),
    };
  }

  const pendingRegistrations = await Registration.find({
    _id: { $in: uniqueObjectIds },
    eventId: eventObjectId,
    status: "pending",
  })
    .select("_id")
    .lean();

  if (pendingRegistrations.length === 0) {
    return {
      modifiedCount: 0,
      queuedCount: 0,
      failedQueueCount: 0,
      queueFailures: [],
      message: buildBulkApproveMessage({
        modifiedCount: 0,
        queuedCount: 0,
        failedQueueCount: 0,
      }),
    };
  }

  const ops = pendingRegistrations.map((registration) => ({
    updateOne: {
      filter: {
        _id: registration._id,
        eventId: eventObjectId,
        status: "pending" as const,
      },
      update: {
        $set: {
          status: "approved" as const,
          "approval.approvedBy": userObjectId,
          "approval.approvedAt": now,
          ticket: buildRegistrationTicket({
            registrationId: registration._id.toString(),
            eventId,
          }),
        },
      },
    },
  }));

  const result = await Registration.bulkWrite(ops);
  const approvedRegistrationIds = (
    await Registration.find({
      _id: { $in: pendingRegistrations.map((registration) => registration._id) },
      eventId: eventObjectId,
      status: "approved",
      "approval.approvedBy": userObjectId,
      "approval.approvedAt": now,
    })
      .select("_id")
      .lean()
  ).map((registration) => registration._id.toString());

  const queueSummary = await queueApprovedRegistrationTicketEmails(
    approvedRegistrationIds,
  );

  return {
    modifiedCount: result.modifiedCount,
    ...queueSummary,
    message: buildBulkApproveMessage({
      modifiedCount: result.modifiedCount,
      queuedCount: queueSummary.queuedCount,
      failedQueueCount: queueSummary.failedQueueCount,
    }),
  };
}

export async function rejectAllPending(eventId: string, userId: string) {
  const result = await Registration.updateMany(
    {
      eventId: new Types.ObjectId(eventId),
      status: "pending",
    },
    {
      $set: {
        status: "rejected",
        "approval.rejectedBy": new Types.ObjectId(userId),
        "approval.rejectedAt": new Date(),
      },
    },
  );

  return { modifiedCount: result.modifiedCount };
}

export async function bulkRejectRegistrations(
  eventId: string,
  ids: BulkRejectBody["ids"],
  userId: string,
) {
  const result = await Registration.updateMany(
    {
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
      eventId: new Types.ObjectId(eventId),
      status: "pending",
    },
    {
      $set: {
        status: "rejected",
        "approval.rejectedBy": new Types.ObjectId(userId),
        "approval.rejectedAt": new Date(),
      },
    },
  );

  return { modifiedCount: result.modifiedCount };
}
