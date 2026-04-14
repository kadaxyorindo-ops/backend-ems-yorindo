import type { Request, Response, NextFunction } from "express";
import { submitVisitorRegistration as submitVisitorRegistrationService } from "../services/visitor.service.ts";
import type { VisitorRegistrationBody } from "../validators/visitor.validators.ts";

export const submitVisitorRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const payload = req.body as VisitorRegistrationBody;
    const result = await submitVisitorRegistrationService(payload);

    if (!result) {
      res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Proses registrasi berhasil!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
