import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditEntity } from "../users/audit.entity.js";
import { UserEntity } from "../users/user.entity.js";
import { hashPassword, verifyPassword } from "./password.util.js";
import { parseExpiresIn, signJwt } from "./token.util.js";

export interface AuthUserDto {
  id: number;
  name: string;
  role: string;
  contact: string;
  lastLogin: string | null;
  status: string;
}

function toDto(u: UserEntity): AuthUserDto {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    contact: u.contact ?? "",
    lastLogin: u.lastLoginAt,
    status: u.status,
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(AuditEntity) private readonly audit: Repository<AuditEntity>,
    private readonly config: ConfigService,
  ) {}

  private get secret(): string {
    return this.config.get<string>("JWT_SECRET", "") || "dev-only-insecure-secret-change-me";
  }

  private get expiresInSec(): number {
    return parseExpiresIn(this.config.get<string>("JWT_EXPIRES_IN", "12h") ?? "12h");
  }

  /** Find by contact or name (case-insensitive, trimmed). */
  async findByIdentifier(identifier: string): Promise<UserEntity | null> {
    const needle = identifier.trim().toLowerCase();
    if (!needle) return null;
    const all = await this.users.find();
    return (
      all.find(
        (u) =>
          u.name.trim().toLowerCase() === needle ||
          (u.contact ?? "").trim().toLowerCase() === needle,
      ) ?? null
    );
  }

  async login(identifier: string, password: string): Promise<{ token: string; user: AuthUserDto }> {
    const user = await this.findByIdentifier(identifier);
    // Generic message to avoid user enumeration.
    if (!user || user.status !== "Active" || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    user.lastLoginAt = new Date().toISOString();
    await this.users.save(user);
    await this.audit.save({
      user: user.name,
      action: "Login",
      details: `Credential login as ${user.role}`,
      timestamp: new Date().toISOString(),
    });

    const token = signJwt(
      { sub: user.id, role: user.role, name: user.name },
      this.secret,
      this.expiresInSec,
    );
    return { token, user: toDto(user) };
  }

  async me(userId: number): Promise<AuthUserDto> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.status !== "Active") {
      throw new UnauthorizedException("Account is no longer active");
    }
    return toDto(user);
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Account is no longer active");
    }
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Current password is incorrect");
    user.passwordHash = await hashPassword(newPassword);
    await this.users.save(user);
    await this.audit.save({
      user: user.name,
      action: "Password Changed",
      details: `User ${user.name} changed their password`,
      timestamp: new Date().toISOString(),
    });
  }
}
