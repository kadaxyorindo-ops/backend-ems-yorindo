import { Router } from "express";
import { submitRegistration } from "../controllers/visitorController.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import { visitorRegistrationBodySchema } from "../validators/visitor.validators.ts";

const router = Router();

router.post(
  "/register",
  validate(visitorRegistrationBodySchema, "body"),
  submitRegistration,
);

export default router;
