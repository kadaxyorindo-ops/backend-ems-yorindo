import rateLimit from "express-rate-limit";
import { sendError } from "../utils/apiResponse";

export const requestOtpLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    sendError(
      res,
      429,
      "Too many OTP requests. Please try again in one minute.",
    ),
});

export const verifyOtpLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    sendError(
      res,
      429,
      "Too many OTP verification attempts. Please try again in a few minutes.",
    ),
});
