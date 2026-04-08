import type { Request, Response, NextFunction } from "express";
import { submitVisitorRegistration } from "../services/visitor.service.ts";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";
import type { VisitorRegistrationBody } from "../validators/visitor.validators.ts";

export const submitRegistration = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
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