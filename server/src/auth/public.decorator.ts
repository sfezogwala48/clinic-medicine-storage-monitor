import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "medistore:isPublic";

/** Skip JWT authentication for this route (login, health, docs, device endpoints). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
