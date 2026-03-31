import type { AuthTokenPayload } from "../../utils/jwt.ts";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export {};
