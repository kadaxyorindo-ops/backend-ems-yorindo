import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.ts";

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: "access";
}

export function signAccessToken(payload: {
  userId: string;
  email: string;
  role: string;
}) {
  const options: SignOptions = {
    expiresIn: `${env.jwtExpiresInHours}h`,
  };

  return jwt.sign(
    {
      email: payload.email,
      role: payload.role,
      type: "access",
    },
    env.jwtSecret,
    {
      ...options,
      subject: payload.userId,
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
    decoded.type !== "access"
  ) {
    throw new Error("Invalid token payload");
  }

  return decoded as AuthTokenPayload;
}
