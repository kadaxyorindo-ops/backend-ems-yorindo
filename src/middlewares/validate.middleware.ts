import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { sendError } from "../utils/apiResponse.ts";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return sendError(
        res,
        400,
        "Payload request tidak valid.",
        result.error.flatten(),
      );
    }

    req.body = result.data;
    next();
  };
}
