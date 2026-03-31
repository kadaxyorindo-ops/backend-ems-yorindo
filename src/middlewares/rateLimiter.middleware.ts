import rateLimit from "express-rate-limit";
import { sendError } from "../utils/apiResponse.ts";

export const requestOtpLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    sendError(
      res,
      429,
      "Terlalu banyak permintaan OTP. Coba lagi dalam satu menit.",
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
      "Terlalu banyak percobaan verifikasi OTP. Coba lagi beberapa menit lagi.",
    ),
});
