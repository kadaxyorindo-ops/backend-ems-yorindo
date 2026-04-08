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
  email: z.string().trim().email("Invalid email."),
});

const verifyOtpSchema = z.object({
  email: z.string().trim().email("Invalid email."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "The OTP code must consist of 6 digits."),
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
        "The OTP code has been sent to your email.",
        result,
      );
    } catch (error) {
      return sendError(
        res,
        400,
        error instanceof Error ? error.message : "Failed to request login OTP.",
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

      return sendSuccess(res, 200, "Login success.", result);
    } catch (error) {
      return sendError(
        res,
        401,
        error instanceof Error ? error.message : "OTP verification failed.",
      );
    }
  },
);

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.sub;

    if (!userId) {
      return sendError(res, 401, "Login session not found.");
    }

    const user = await getAuthenticatedUser(userId);
    return sendSuccess(res, 200, "The user profile has been successfully retrieved.", user);
  } catch (error) {
    return sendError(
      res,
      401,
      error instanceof Error ? error.message : "Failed to retrieve login profile.",
    );
  }
});


export default authRouter;
