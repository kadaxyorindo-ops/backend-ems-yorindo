/**
 * @file middlewares/validate.middleware.ts
 * @description Generic middleware factory for request validation using Zod.
 *
 * Usage in a route file:
 *   router.get("/", validate(mySchema, "query"), myController);
 *
 * On success:  the parsed+coerced data is stored in res.locals.parsed[location]
 *              so the controller receives the correct types (e.g. numbers,
 *              not strings, for coerced query params). Express 5 makes req.query
 *              a read-only getter, so we cannot write back to req directly.
 * On failure:  responds with 422 and structured Zod field errors immediately,
 *              before the controller is ever called.
 */

import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import { sendError } from "../utils/apiResponse";

type RequestLocation = "body" | "query" | "params";

export function validate(
  schema: ZodType,
  location: RequestLocation = "body",
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[location]);

    if (!result.success) {
      sendError(
        res,
        422,
        "Validation failed",
        result.error.issues,
      );
      return;
    }

    // Store parsed+coerced data in res.locals so coercions (string→number) are
    // visible to the controller. Express 5 makes req.query a read-only getter,
    // so res.locals is the correct place to pass data down the middleware chain.
    res.locals.parsed ??= {};
    res.locals.parsed[location] = result.data;

    next();
  };
}
