import type { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/apiResponse.ts";
import { verifyAccessToken } from "../utils/jwt.ts";
import type { SystemRole } from "../models/constants/enums.ts";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return sendError(res, 401, "Access denied. Please log in again.");
  }

  const token = authorization.slice("Bearer ".length).trim();

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    return sendError(
      res,
      401,
      "The login session is invalid.",
    );
  }
}

export function requireRole(...roles: SystemRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role as SystemRole)) {
      return sendError(res, 403, "Access denied. You don't have permission.");
    }
    next();
  };
}