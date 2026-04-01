/**
 * @file services/registration.service.ts
 * @description Business logic for participant registration management.
 *
 * Rules:
 *  - No Express types here — this layer is HTTP-agnostic.
 *  - Import models ONLY from "../models/index.ts" (project convention).
 *  - All DB errors propagate naturally; the controller catches them via next().
 *
 * Design notes:
 *  - getRegistrations uses an aggregation pipeline with $lookup so that name
 *    search works across both the Registration and Participant collections in
 *    a single DB round-trip.
 *  - bulkApproveRegistrations uses bulkWrite so that N approvals cost one
 *    round-trip, each getting its own unique QR code (can't be done with updateMany).
 *  - Ticket QR codes are generated using Node's built-in crypto.randomUUID(),
 *    which produces a cryptographically random UUID — no external package needed.
 */

import { Registration } from "../models/index.js";
import { Types } from "mongoose";
import { randomUUID } from "crypto";
import type {
  GetRegistrationsQuery,
  BulkApproveBody,
  RejectBody,
} from "../validators/registration.validators.js";

// --- Types ---

/** Shape of the per-event status counters returned in every list response. */
interface RegistrationMeta {
  approvedCount:  number;
  pendingCount:   number;
  rejectedCount:  number;
  checkedInCount: number;
  totalCount:     number;
}

// --- Helpers ---

/** Builds the ticket sub-document issued on approval. */
function buildTicket() {
  return {
    qrCode:       randomUUID(),
    issuedAt:     new Date(),
    reissueCount: 0,
    isActive:     true,
  };
}

/** Converts raw status-group aggregation output into a typed RegistrationMeta. */
function buildMeta(groups: { _id: string; count: number }[]): RegistrationMeta {
  const meta: RegistrationMeta = {
    approvedCount: 0, pendingCount: 0, rejectedCount: 0, checkedInCount: 0, totalCount: 0,
  };
  for (const { _id, count } of groups) {
    meta.totalCount += count;
    if (_id === "approved")   meta.approvedCount  = count;
    else if (_id === "pending")    meta.pendingCount   = count;
    else if (_id === "rejected")   meta.rejectedCount  = count;
    else if (_id === "checked_in") meta.checkedInCount = count;
  }
  return meta;
}

// --- Service functions ---

/**
 * Returns a paginated list of registrations for an event, with optional
 * search (name / organization), status filter, and sector filter.
 *
 * Also returns event-level meta counts (approved / pending / rejected / total)
 * for the header counter — computed in parallel with the list query.
 *
 * Search strategy:
 *   A $lookup joins Participant into each Registration document, then a $match
 *   filters on participant.normalizedFullName OR companySnapshot.name. Both
 *   fields are indexed, keeping the aggregation efficient.
 */
export async function getRegistrations(eventId: string, query: GetRegistrationsQuery) {
  const { page, limit, status, sector, search } = query;
  const skip = (page - 1) * limit;

  // Build the base match — filters applied before the $lookup for efficiency.
  const baseMatch: Record<string, unknown> = {
    eventId: new Types.ObjectId(eventId),
  };
  if (status) baseMatch.status = status;
  if (sector) baseMatch["industrySnapshot.refId"] = new Types.ObjectId(sector);

  // Search stage is applied after $lookup (needs participant fields).
  const searchStages = search
    ? [{
        $match: {
          $or: [
            { "participant.normalizedFullName": { $regex: search, $options: "i" } },
            { "companySnapshot.name":           { $regex: search, $options: "i" } },
          ],
        },
      }]
    : [];

  const [result, statusGroups] = await Promise.all([
    Registration.aggregate([
      { $match: baseMatch },

      // Join only the participant fields needed — avoids pulling full documents.
      {
        $lookup: {
          from: "participants",
          let: { pId: "$participantId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$pId"] } } },
            { $project: { fullName: 1, normalizedFullName: 1, personalEmail: 1, companyEmail: 1 } },
          ],
          as: "participant",
        },
      },

      // $unwind: one registration → one participant (enforced by unique index).
      { $unwind: "$participant" },

      // Optional search filter across participant name + company snapshot name.
      ...searchStages,

      // $facet: paginated list + total count in a single aggregation pass.
      {
        $facet: {
          items: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            // Strip the normalizedFullName — it was only needed for search matching.
            { $project: { "participant.normalizedFullName": 0 } },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]),

    // Meta counts: always against the full event (no filters), for the header.
    Registration.aggregate([
      { $match: { eventId: new Types.ObjectId(eventId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const items: unknown[]  = result[0]?.items  ?? [];
  const total: number     = result[0]?.total[0]?.count ?? 0;

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

/**
 * Returns distinct sectors (industrySnapshot) and statuses present in the
 * event's registrations — used to populate the filter dropdowns on the UI.
 * Only sectors/statuses that actually appear in this event are returned.
 */
export async function getRegistrationFilters(eventId: string) {
  const eventObjectId = new Types.ObjectId(eventId);

  const [sectors, statuses] = await Promise.all([
    Registration.aggregate([
      { $match: { eventId: eventObjectId } },
      { $group: { _id: { refId: "$industrySnapshot.refId", name: "$industrySnapshot.name" } } },
      { $project: { _id: 0, refId: "$_id.refId", name: "$_id.name" } },
      { $sort: { name: 1 } },
    ]),
    Registration.distinct("status", { eventId: eventObjectId }),
  ]);

  return { sectors, statuses };
}

/**
 * Approves a single pending registration and generates its QR ticket.
 * Returns null if no matching pending registration exists (controller → 404).
 */
export async function approveRegistration(
  eventId: string,
  registrationId: string,
  userId: string,
) {
  return Registration.findOneAndUpdate(
    {
      _id:     new Types.ObjectId(registrationId),
      eventId: new Types.ObjectId(eventId),
      status:  "pending",
    },
    {
      $set: {
        status:                 "approved",
        "approval.approvedBy":  new Types.ObjectId(userId),
        "approval.approvedAt":  new Date(),
        ticket:                 buildTicket(),
      },
    },
    { new: true },
  ).lean();
}

/**
 * Rejects a single pending registration.
 * rejectionReason is stored when provided; omitted otherwise (optional by design).
 * Returns null if no matching pending registration exists (controller → 404).
 */
export async function rejectRegistration(
  eventId: string,
  registrationId: string,
  userId: string,
  rejectionReason?: string,
) {
  const setFields: Record<string, unknown> = {
    status:                "rejected",
    "approval.rejectedBy": new Types.ObjectId(userId),
    "approval.rejectedAt": new Date(),
  };
  if (rejectionReason) setFields["approval.rejectionReason"] = rejectionReason;

  return Registration.findOneAndUpdate(
    {
      _id:     new Types.ObjectId(registrationId),
      eventId: new Types.ObjectId(eventId),
      status:  "pending",
    },
    { $set: setFields },
    { new: true },
  ).lean();
}

/**
 * Bulk-approves selected pending registrations.
 * Each registration receives its own unique QR code — bulkWrite is used so
 * this is still a single DB round-trip regardless of how many IDs are passed.
 * Non-pending registrations in the ID list are silently skipped.
 */
export async function bulkApproveRegistrations(
  eventId: string,
  ids: string[],
  userId: string,
) {
  const now = new Date();
  const eventObjectId = new Types.ObjectId(eventId);

  const ops = ids.map((id) => ({
    updateOne: {
      filter: {
        _id:     new Types.ObjectId(id),
        eventId: eventObjectId,
        status:  "pending",
      },
      update: {
        $set: {
          status:                "approved",
          "approval.approvedBy": new Types.ObjectId(userId),
          "approval.approvedAt": now,
          ticket:                buildTicket(),
        },
      },
    },
  }));

  const result = await Registration.bulkWrite(ops);
  return { modifiedCount: result.modifiedCount };
}

/**
 * Rejects all pending registrations for an event in a single updateMany call.
 * Already-approved or checked-in registrations are not affected.
 */
export async function rejectAllPending(eventId: string, userId: string) {
  const result = await Registration.updateMany(
    { eventId: new Types.ObjectId(eventId), status: "pending" },
    {
      $set: {
        status:                "rejected",
        "approval.rejectedBy": new Types.ObjectId(userId),
        "approval.rejectedAt": new Date(),
      },
    },
  );

  return { modifiedCount: result.modifiedCount };
}
