import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { AuditLog, Otp, User } from "../models/index.ts";
import { STATUS, type SystemRole } from "../models/constants/enums.ts";
import { env } from "../config/env.ts";
import { sendLoginOtpEmail } from "./email.service.ts";
import { signAccessToken } from "../utils/jwt.ts";

const SYSTEM_ROLE_SET = new Set<SystemRole>(STATUS.SYSTEM_ROLE);

export interface RequestLoginOtpPayload {
  email: string;
  ipAddress: string | null;
}

export interface VerifyLoginOtpPayload {
  email: string;
  code: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationName: string | null;
  lastLoginAt: string | null;
  permissions: string[];
}

export interface RequestLoginOtpResult {
  email: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export interface VerifyLoginOtpResult {
  token: string;
  expiresInSeconds: number;
  user: AuthenticatedUser;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeIpAddress(ipAddress: string | null) {
  if (!ipAddress) return null;
  return ipAddress.startsWith("::ffff:") ? ipAddress.slice(7) : ipAddress;
}

function generateOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function ensureSystemRole(role: string): role is SystemRole {
  return SYSTEM_ROLE_SET.has(role as SystemRole);
}

function toUserResponse(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationName: string | null;
  lastLoginAt: Date | null;
  permissions: string[];
}): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationName: user.organizationName,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    // super_admin bypasses permission checks at the middleware level.
    // We still return the array here (it will be [] for super_admin) so the
    // frontend receives a consistent shape regardless of role.
    permissions: user.permissions ?? [],
  };
}

export async function requestLoginOtp(
  payload: RequestLoginOtpPayload,
): Promise<RequestLoginOtpResult> {
  const email = normalizeEmail(payload.email);
  const ipAddress = normalizeIpAddress(payload.ipAddress);
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Email tersebut belum terdaftar sebagai akun staf EMS.");
  }

  if (!user.isActive) {
    throw new Error("Akun Anda sedang nonaktif. Silakan hubungi administrator.");
  }

  if (!ensureSystemRole(user.role)) {
    throw new Error("Email ini tidak memiliki akses ke dashboard internal.");
  }

  const latestOtp = await Otp.findOne({
    email,
    purpose: "login",
    isUsed: false,
  }).sort({ createdAt: -1 });

  if (latestOtp?.createdAt) {
    const secondsSinceLastOtp = Math.floor(
      (Date.now() - latestOtp.createdAt.getTime()) / 1000,
    );
    const remainingCooldown =
      env.otpResendCooldownSeconds - secondsSinceLastOtp;

    if (remainingCooldown > 0) {
      throw new Error(
        `Kode baru bisa dikirim ulang dalam ${remainingCooldown} detik.`,
      );
    }
  }

  await Otp.updateMany(
    { email, purpose: "login", isUsed: false },
    { $set: { isUsed: true } },
  );

  const otp = generateOtpCode();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(
    Date.now() + env.otpExpiresInMinutes * 60 * 1000,
  );

  const otpRecord = await Otp.create({
    email,
    otpHash,
    purpose: "login",
    expiresAt,
    ipAddress,
  });

  try {
    await sendLoginOtpEmail({
      to: user.email,
      name: user.name,
      otp,
    });
  } catch (error) {
    await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });
    throw new Error(
      error instanceof Error
        ? `Gagal mengirim email OTP: ${error.message}`
        : "Gagal mengirim email OTP.",
    );
  }

  return {
    email,
    expiresInSeconds: env.otpExpiresInMinutes * 60,
    resendAvailableInSeconds: env.otpResendCooldownSeconds,
  };
}

export async function verifyLoginOtp(
  payload: VerifyLoginOtpPayload,
): Promise<VerifyLoginOtpResult> {
  const email = normalizeEmail(payload.email);
  const code = payload.code.trim();
  const ipAddress = normalizeIpAddress(payload.ipAddress);
  const user = await User.findOne({ email });

  if (!user || !user.isActive || !ensureSystemRole(user.role)) {
    throw new Error("Akun login tidak valid untuk dashboard EMS.");
  }

  const otpRecord = await Otp.findOne({
    email,
    purpose: "login",
    isUsed: false,
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new Error("Kode OTP tidak ditemukan. Silakan minta kode baru.");
  }

  if (otpRecord.expiresAt.getTime() <= Date.now()) {
    otpRecord.isUsed = true;
    await otpRecord.save();
    throw new Error("Kode OTP sudah kedaluwarsa. Silakan minta kode baru.");
  }

  const isMatch = await bcrypt.compare(code, otpRecord.otpHash);

  if (!isMatch) {
    otpRecord.attempts += 1;

    if (otpRecord.attempts >= env.otpMaxAttempts) {
      otpRecord.isUsed = true;
    }

    await otpRecord.save();

    if (otpRecord.isUsed) {
      throw new Error(
        "Kode OTP salah terlalu banyak kali. Silakan minta kode baru.",
      );
    }

    throw new Error(
      `Kode OTP tidak sesuai. Sisa percobaan ${
        env.otpMaxAttempts - otpRecord.attempts
      } kali.`,
    );
  }

  otpRecord.isUsed = true;
  await otpRecord.save();

  user.lastLoginAt = new Date();
  await user.save();

  // Permissions are baked into the JWT at login time.
  // If super_admin changes a user's permissions, the change takes effect on
  // that user's next login (when a fresh token is issued). For an internal
  // staff tool this tradeoff is acceptable — no need for token revocation.
  const token = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions ?? [],
  });

  void AuditLog.create({
    actorUserId: user._id,
    action: "login",
    entityType: "user",
    entityId: user._id,
    metadata: {
      userAgent: payload.userAgent,
      authMethod: "email_otp",
    },
    ipAddress,
  }).catch((error) => {
    console.warn("[AUDIT] Failed to record login audit log:", error);
  });

  return {
    token,
    expiresInSeconds: env.jwtExpiresInHours * 60 * 60,
    user: toUserResponse(user),
  };
}

export async function getAuthenticatedUser(userId: string) {
  const user = await User.findById(userId);

  if (!user || !user.isActive || !ensureSystemRole(user.role)) {
    throw new Error("Pengguna tidak ditemukan atau tidak lagi aktif.");
  }

  return toUserResponse(user);
}
