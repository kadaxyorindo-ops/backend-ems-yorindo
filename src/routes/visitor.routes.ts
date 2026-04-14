import { Router } from "express";
import { submitVisitorRegistration } from "../controllers/visitorController";
import { validate } from "../middlewares/validate.middleware";
import { visitorRegistrationBodySchema } from "../validators/visitor.validators";

const router = Router();

router.post(
  "/register",
  validate(visitorRegistrationBodySchema, "body"),
  submitVisitorRegistration,
);

export default router;
