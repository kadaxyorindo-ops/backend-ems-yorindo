/**
 * @file services/event-analytic.service.ts
 * @description Analytics queries for event participant metrics.
 */

import { Event, Registration } from "../models/index";
import { Types } from "mongoose";
import { STATUS } from "../models/constants/enums";

export interface EventParticipantAnalyticsSummary {
  eventId: string;
  totalInvitations: number;
  totalRegistrations: number;
  totalApproved: number;
  totalAttendance: number;
  attendanceRate: number;
}

export interface EventAnalyticsOverview {
  eventId: string;
  month: string;
  summary: EventParticipantAnalyticsSummary;
  statusBreakdown: Record<string, number>;
  registrationsOverTime: Array<{ date: string; count: number }>;
  topIndustries: Array<{ name: string; count: number }>;
  topCities: Array<{ name: string; count: number }>;
}

const APPROVED_STATUSES = ["approved", "checked_in", "check-in"] as const;
const ATTENDANCE_STATUSES = ["checked_in", "check-in"] as const;
const TIMEZONE = "Asia/Jakarta";

function parseMonthRange(month?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const [yearStr, monthStr] = month ? month.split("-") : [];
  const year = month ? Number(yearStr) : now.getFullYear();
  const monthIndex = month ? Number(monthStr) - 1 : now.getMonth();
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  const label = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return { start, end, label };
}

function buildDailySeries(
  start: Date,
  end: Date,
  counts: Record<string, number>,
): Array<{ date: string; count: number }> {
  const result: Array<{ date: string; count: number }> = [];
  const cursor = new Date(start);
  while (cursor < end) {
    const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    result.push({ date: dateKey, count: counts[dateKey] ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export async function getEventParticipantAnalytics(
  eventId: string,
): Promise<EventParticipantAnalyticsSummary | null> {
  const eventExists = await Event.exists({ _id: eventId });
  if (!eventExists) return null;

  const [totalInvitations, totalRegistrations, totalApproved, totalAttendance] =
    await Promise.all([
      Registration.distinct("participantId").then((ids) => ids.length),
      Registration.countDocuments({ eventId }),
      Registration.countDocuments({
        eventId,
        status: { $in: APPROVED_STATUSES },
      }),
      Registration.countDocuments({
        eventId,
        status: { $in: ATTENDANCE_STATUSES },
      }),
    ]);

  const attendanceRate =
    totalApproved > 0 ? (totalAttendance / totalApproved) * 100 : 0;

  return {
    eventId,
    totalInvitations,
    totalRegistrations,
    totalApproved,
    totalAttendance,
    attendanceRate,
  };
}

export async function getEventAnalyticsOverview(
  eventId: string,
  month?: string,
): Promise<EventAnalyticsOverview | null> {
  const eventExists = await Event.exists({ _id: eventId });
  if (!eventExists) return null;

  const eventObjectId = new Types.ObjectId(eventId);
  const { start, end, label } = parseMonthRange(month);

  const [
    summary,
    statusAgg,
    registrationsAgg,
    topIndustriesAgg,
    topCitiesAgg,
  ] = await Promise.all([
    getEventParticipantAnalytics(eventId),
    Registration.aggregate([
      { $match: { eventId: eventObjectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Registration.aggregate([
      {
        $match: {
          eventId: eventObjectId,
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TIMEZONE },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Registration.aggregate([
      { $match: { eventId: eventObjectId } },
      { $group: { _id: "$industrySnapshot.name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Registration.aggregate([
      { $match: { eventId: eventObjectId } },
      { $group: { _id: "$citySnapshot.name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  if (!summary) return null;

  const statusBreakdown: Record<string, number> = {};
  for (const status of STATUS.REGISTRATION) {
    statusBreakdown[status] = 0;
  }

  for (const row of statusAgg as Array<{ _id: string; count: number }>) {
    if (row._id === "check-in") {
      statusBreakdown.checked_in = (statusBreakdown.checked_in ?? 0) + row.count;
      continue;
    }
    statusBreakdown[row._id] = row.count;
  }

  const registrationsMap: Record<string, number> = {};
  for (const row of registrationsAgg as Array<{ _id: string; count: number }>) {
    registrationsMap[row._id] = row.count;
  }

  const registrationsOverTime = buildDailySeries(start, end, registrationsMap);

  return {
    eventId,
    month: label,
    summary,
    statusBreakdown,
    registrationsOverTime,
    topIndustries: (topIndustriesAgg as Array<{ _id: string; count: number }>).map(
      (row) => ({ name: row._id ?? "Unknown", count: row.count }),
    ),
    topCities: (topCitiesAgg as Array<{ _id: string; count: number }>).map(
      (row) => ({ name: row._id ?? "Unknown", count: row.count }),
    ),
  };
}
