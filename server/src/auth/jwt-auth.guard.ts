import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "./public.decorator.js";
import { ROLES_KEY } from "./roles.decorator.js";
import { verifyJwt } from "./token.util.js";

export interface AuthenticatedUser {
  id: number;
  role: "admin" | "supervisor" | "staff";
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Global JWT guard: every `/api/*` route requires a Bearer token except
 * routes marked @Public(). Also enforces @Roles() where present.
 *
 * Device/simulator paths (`/telemetry/*`), health probes, and Scalar docs
 * stay public so firmware and load-balancers keep working without credentials.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Device/simulator traffic arrives over MQTT, not HTTP: there is no
    // request to authenticate, so non-HTTP contexts always pass.
    if (context.getType() !== "http") {
      return true;
    }
    const handler = context.getHandler();
    const target = context.getClass();
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler, target])) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const path: string = (req as { path?: string }).path ?? req.url ?? "";

    // Never gate ops/docs/device endpoints — only the UI API is protected.
    if (
      path === "/health" ||
      path.startsWith("/health/") ||
      path === "/openapi.json" ||
      path.startsWith("/reference") ||
      path.startsWith("/telemetry")
    ) {
      return true;
    }

    const header = req.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    let payload: { sub: number; role: string; name: string };
    try {
      payload = verifyJwt(token, this.jwtSecret());
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    if (!["admin", "supervisor", "staff"].includes(payload.role)) {
      throw new UnauthorizedException("Invalid token role");
    }
    req.user = {
      id: payload.sub,
      role: payload.role as AuthenticatedUser["role"],
      name: payload.name,
    };

    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [handler, target]);
    if (required && required.length > 0 && !required.includes(payload.role)) {
      throw new UnauthorizedException("Insufficient role for this resource");
    }
    return true;
  }

  private jwtSecret(): string {
    return this.config.get<string>("JWT_SECRET", "") || "dev-only-insecure-secret-change-me";
  }
}
