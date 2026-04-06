import { Router } from "express";
import { validate } from "../middlewares/validate.middleware";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import {
  getUsersQuerySchema,
  createUserBodySchema,
  updateUserBodySchema,
  userParamsSchema,
} from "../validators/user.validators";
import {
  handleGetUsers,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
  handleToggleUserActive,
} from "../controllers/user.controller";

const router = Router();

router.get("/",
  requireAuth,
  requireRole("super_admin"),
  validate(getUsersQuerySchema, "query"),
  handleGetUsers,
);

router.post("/",
  requireAuth,
  requireRole("super_admin"),
  validate(createUserBodySchema, "body"),
  handleCreateUser,
);

router.patch("/:id",
  requireAuth,
  requireRole("super_admin"),
  validate(userParamsSchema, "params"),
  validate(updateUserBodySchema, "body"),
  handleUpdateUser,
);

router.delete("/:id",
  requireAuth,
  requireRole("super_admin"),
  validate(userParamsSchema, "params"),
  handleDeleteUser,
);

router.patch("/:id/toggle-active",
  requireAuth,
  requireRole("super_admin"),
  validate(userParamsSchema, "params"),
  handleToggleUserActive,
);

export default router;
