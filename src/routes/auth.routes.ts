import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware.ts";
import {
  requestOtpLimiter,
  verifyOtpLimiter,
} from "../middlewares/rateLimiter.middleware.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";
import {
  getAuthenticatedUser,
  requestLoginOtp,
  verifyLoginOtp,
} from "../services/auth.service.ts";

const authRouter = Router();

const requestOtpSchema = z.object({
  email: z.string().trim().email("Email tidak valid."),
});

const verifyOtpSchema = z.object({
  email: z.string().trim().email("Email tidak valid."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Kode OTP harus terdiri dari 6 digit."),
});

authRouter.post(
  "/request-otp",
  requestOtpLimiter,
  validate(requestOtpSchema),
  async (req, res) => {
    try {
      const result = await requestLoginOtp({
        email: res.locals.parsed.body.email,
        ipAddress: req.ip ?? null,
      });

      return sendSuccess(
        res,
        200,
        "Kode OTP sudah dikirim ke email Anda.",
        result,
      );
    } catch (error) {
      return sendError(
        res,
        400,
        error instanceof Error ? error.message : "Gagal meminta OTP login.",
      );
    }
  },
);

authRouter.post(
  "/verify-otp",
  verifyOtpLimiter,
  validate(verifyOtpSchema),
  async (req, res) => {
    try {
      const result = await verifyLoginOtp({
        email: res.locals.parsed.body.email,
        code: res.locals.parsed.body.code,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });

      return sendSuccess(res, 200, "Login berhasil.", result);
    } catch (error) {
      return sendError(
        res,
        401,
        error instanceof Error ? error.message : "Verifikasi OTP gagal.",
      );
    }
  },
);

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.sub;

    if (!userId) {
      return sendError(res, 401, "Sesi login tidak ditemukan.");
    }

    const user = await getAuthenticatedUser(userId);
    return sendSuccess(res, 200, "Profil pengguna berhasil diambil.", user);
  } catch (error) {
    return sendError(
      res,
      401,
      error instanceof Error ? error.message : "Gagal mengambil profil login.",
    );
  }
});

export default authRouter;
