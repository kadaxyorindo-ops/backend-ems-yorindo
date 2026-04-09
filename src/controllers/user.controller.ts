import type { Request, Response, NextFunction } from "express";
import { User } from "../models";
import { sendSuccess, sendError } from "../utils/apiResponse";
import type {
  GetUsersQuery,
  CreateUserBody,
  UpdateUserBody,
  UserParams,
} from "../validators/user.validators";
import { DEFAULT_ROLE_PERMISSIONS } from "../models/constants/rolePermissions.ts";

export async function handleGetUsers(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit, search, role } = res.locals.parsed.query as GetUsersQuery;

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) filter.role = role;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    sendSuccess(res, 200, "Users fetched successfully", {
      items: items.map((u) => ({ ...u, permissions: u.permissions ?? [] })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateUser(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = res.locals.parsed.body as CreateUserBody;

    const existing = await User.findOne({ email: body.email.toLowerCase() }).lean();
    if (existing) {
      sendError(res, 409, "A user with this email already exists.");
      return;
    }

    const user = await User.create({
      name:             body.name,
      email:            body.email,
      role:             body.role,
      organizationName: body.organizationName,
      permissions:      DEFAULT_ROLE_PERMISSIONS[body.role] ?? [],
    });

    sendSuccess(res, 201, "User created successfully", user.toObject());
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateUser(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }  = res.locals.parsed.params as UserParams;
    const body    = res.locals.parsed.body   as UpdateUserBody;

    const update: Record<string, unknown> = {};
    if (body.name             !== undefined) update.name             = body.name;
    if (body.organizationName !== undefined) update.organizationName = body.organizationName;
    if (body.role             !== undefined) {
      update.role        = body.role;
      update.permissions = DEFAULT_ROLE_PERMISSIONS[body.role] ?? [];
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    ).lean();

    if (!user) {
      sendError(res, 404, "User not found.");
      return;
    }

    sendSuccess(res, 200, "User updated successfully", user);
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = res.locals.parsed.params as UserParams;

    if (req.auth!.sub === id) {
      sendError(res, 400, "You cannot delete your own account.");
      return;
    }

    const user = await User.findByIdAndDelete(id).lean();

    if (!user) {
      sendError(res, 404, "User not found.");
      return;
    }

    sendSuccess(res, 200, "User deleted successfully.", null);
  } catch (error) {
    next(error);
  }
}

export async function handleToggleUserActive(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = res.locals.parsed.params as UserParams;

    const user = await User.findById(id).lean();
    if (!user) {
      sendError(res, 404, "User not found.");
      return;
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: !user.isActive } },
      { new: true },
    ).lean();

    sendSuccess(
      res,
      200,
      updated!.isActive ? "User activated." : "User deactivated.",
      updated,
    );
  } catch (error) {
    next(error);
  }
}
