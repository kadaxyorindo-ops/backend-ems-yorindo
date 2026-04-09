/**
 * @file rolePermissions.ts
 * @description Default permissions assigned to each non-admin role.
 *
 * These are applied:
 *   1. When a new user is created (user.controller.ts)
 *   2. When an existing user logs in with an empty permissions array —
 *      backfills legacy accounts created before this system existed
 *   3. When a user's role is changed (resets to the new role's defaults)
 *
 * super_admin and admin are excluded — they bypass requirePermission()
 * entirely, so their permissions array is unused.
 */

import type { Permission } from "./enums.ts";

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  event_operator: [
    "events:view",
    "events:create",
    "events:edit",
    "events:delete",
    "registrations:view",
    "registrations:approve",
    "registrations:checkin",
  ],
  communication_operator: [
    "communication:view",
    "communication:send",
  ],
  survey_analyst: [
    "surveys:view",
    "surveys:manage",
    "analytics:view",
  ],
};
