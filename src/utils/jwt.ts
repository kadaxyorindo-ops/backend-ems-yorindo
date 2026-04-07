import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.ts";

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  type: "access";
}

export interface RegistrationTicketPayload extends JwtPayload {
  sub: string;
  eventId: string;
  qrCode: string;
  type: "registration_ticket";
}

export function signAccessToken(payload: {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}) {
  const options: SignOptions = {
    expiresIn: `${env.jwtExpiresInHours}h`,
  };

  return jwt.sign(
    {
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
      type: "access",
    },
    env.jwtSecret,
    {
      ...options,
      subject: payload.userId,
    },
  );
}

export function signRegistrationTicket(payload: {
  registrationId: string;
  eventId: string;
  qrCode: string;
}) {
  return jwt.sign(
    {
      eventId: payload.eventId,
      qrCode: payload.qrCode,
      type: "registration_ticket",
    },
    env.jwtSecret,
    {
      subject: payload.registrationId,
    },
  );
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }

  if (
    typeof decoded.sub !== "string" ||
    typeof decoded.email !== "string" ||
    typeof decoded.role !== "string" ||
    !Array.isArray(decoded.permissions) ||
    decoded.type !== "access"
  ) {
    throw new Error("Invalid token payload");
  }

  return decoded as AuthTokenPayload;
}

export function verifyRegistrationTicket(
  token: string,
): RegistrationTicketPayload {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (typeof decoded === "string") {
    throw new Error("Invalid ticket payload");
  }

  if (
    typeof decoded.sub !== "string" ||
    typeof decoded.eventId !== "string" ||
    typeof decoded.qrCode !== "string" ||
    decoded.type !== "registration_ticket"
  ) {
    throw new Error("Invalid ticket payload");
  }

  return decoded as RegistrationTicketPayload;
}
