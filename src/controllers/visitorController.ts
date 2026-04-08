import type { Request, Response } from 'express';
import City from '../models/City.ts';
import Company from '../models/Company.ts';
import Industry from '../models/Industry.ts';
import JobTitle from '../models/JobTitle.ts';
import Participant from '../models/Participant.ts';
import Registration from '../models/Registration.ts';
import SurveyResponse from '../models/SurveyResponse.ts';
import { Event } from "../models/index.ts";

interface CustomAnswerInput {
  questionId?: string;
  label: string;
  type?: string;
  value: unknown;
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function buildCustomValueMap(input: unknown): Map<string, unknown> {
  const map = new Map<string, unknown>();
  if (!input) return map;

  if (Array.isArray(input)) {
    for (const item of input as CustomAnswerInput[]) {
      if (item?.label) {
        map.set(normalizeKey(item.label), item.value);
      }
    }
    return map;
  }

  if (typeof input === "object") {
    for (const [label, value] of Object.entries(input as Record<string, unknown>)) {
      map.set(normalizeKey(label), value);
    }
  }

  return map;
}

export const submitRegistration = async (req: Request, res: Response): Promise<any> => {
  try {
    const body = res.locals.parsed.body as VisitorRegistrationBody;
    const result = await submitVisitorRegistration(body);

    if (!result) {
      sendError(res, 404, "Event tidak ditemukan");
      return;
    }

    sendSuccess(res, 201, "Proses Registrasi Berhasil Disimpan ke Semua Database!", result);
  } catch (error) {
    next(error);
  }
};