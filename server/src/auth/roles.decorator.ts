import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "medistore:roles";

/** Restrict a route to these roles. Requires JWT auth (no @Public on the same route). */
export const Roles = (...roles: Array<"admin" | "supervisor" | "staff">) =>
  SetMetadata(ROLES_KEY, roles);
