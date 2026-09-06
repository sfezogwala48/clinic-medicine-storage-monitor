import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { generateTemporaryPassword, hashPassword } from "../auth/password.util.js";
import { AuditEntity } from "./audit.entity.js";
import type { UpdateUserDto } from "./user.dto.js";
import { UserEntity } from "./user.entity.js";

/**
 * Seeded passwords come from the environment (server/.env, see
 * server/.env.example). There are no hardcoded defaults: booting without
 * them fails fast in main.ts so demo credentials can never silently ship.
 */
function seedPassword(role: string): string {
  const value = process.env[`SEED_${role.toUpperCase()}_PASSWORD`];
  if (!value) {
    throw new Error(
      `Missing SEED_${role.toUpperCase()}_PASSWORD — define it in server/.env (see server/.env.example).`,
    );
  }
  return value;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(AuditEntity) private readonly audit: Repository<AuditEntity>,
  ) {}

  async seed(): Promise<void> {
    // Only the admin is seeded. All other users are created manually
    // (POST /api/users, admin only).
    if ((await this.users.count()) === 0) {
      await this.users.save([
        {
          name: "Dr. Ajibola",
          role: "admin",
          contact: "admin@clinic.co.za",
          status: "Active",
          lastLoginAt: null,
          passwordHash: await hashPassword(seedPassword("admin")),
        },
      ]);
    } else {
      // Backfill: databases created before passwordHash existed get passwords
      // from the environment so credential login works after upgrade.
      const existing = await this.users.find();
      for (const u of existing) {
        if (!u.passwordHash) {
          u.passwordHash = await hashPassword(seedPassword(u.role));
          await this.users.save(u);
        }
      }
    }
  }

  listUsers(): Promise<UserEntity[]> {
    return this.users.find({ order: { id: "ASC" } });
  }

  async createUser(input: {
    name: string;
    role?: string;
    contact?: string;
    password?: string;
  }): Promise<{ user: UserEntity; temporaryPassword?: string }> {
    const password = input.password ?? generateTemporaryPassword();
    const user = await this.users.save({
      name: input.name,
      role: (input.role ?? "staff") as UserEntity["role"],
      contact: input.contact ?? null,
      status: "Active",
      lastLoginAt: null,
      passwordHash: await hashPassword(password),
    });
    await this.record("System", "User Created", `${user.name} (${user.role})`);
    return input.password ? { user } : { user, temporaryPassword: password };
  }

  async getUser(id: number): Promise<UserEntity> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async updateUser(id: number, patch: UpdateUserDto): Promise<UserEntity> {
    const user = await this.getUser(id);
    if (patch.name !== undefined) user.name = patch.name;
    // Values are validated by UpdateUserDto (IsIn) before reaching here.
    if (patch.role !== undefined) user.role = patch.role as UserEntity["role"];
    if (patch.contact !== undefined) user.contact = patch.contact;
    if (patch.status !== undefined) user.status = patch.status;
    if (patch.password !== undefined) {
      user.passwordHash = await hashPassword(patch.password);
    }
    const saved = await this.users.save(user);
    await this.record("System", "User Updated", `${saved.name} (id ${saved.id})`);
    return saved;
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.getUser(id);
    await this.users.remove(user);
    await this.record("System", "User Deleted", `${user.name} (id ${user.id})`);
  }

  record(user: string, action: string, details: string): Promise<AuditEntity> {
    return this.audit.save({ user, action, details, timestamp: new Date().toISOString() });
  }

  auditTrail(limit = 100): Promise<AuditEntity[]> {
    return this.audit.find({ order: { id: "DESC" }, take: limit });
  }
}
