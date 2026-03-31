import type { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/apiResponse.ts";
import { verifyAccessToken } from "../utils/jwt.ts";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return sendError(res, 401, "Akses ditolak. Silakan login kembali.");
  }

  const token = authorization.slice("Bearer ".length).trim();

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    return sendError(
      res,
      401,
      "Sesi login tidak valid atau sudah kedaluwarsa.",
    );
  }
}
