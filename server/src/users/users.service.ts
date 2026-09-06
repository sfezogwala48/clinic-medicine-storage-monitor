import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { generateTemporaryPassword, hashPassword } from "../auth/password.util.js";
import { AuditEntity } from "./audit.entity.js";
import type { UpdateUserDto } from "./user.dto.js";
import { UserEntity } from "./user.entity.js";

/**
 * Default seeded passwords (override with SEED_ADMIN_PASSWORD /
 * SEED_SUPERVISOR_PASSWORD / SEED_STAFF_PASSWORD). Documented in USAGE.md
 * and shown as hints on the dashboard login screen.
 */
const DEFAULT_SEED_PASSWORDS: Record<string, string> = {
  admin: process.env.SEED_ADMIN_PASSWORD || "Admin123!",
  supervisor: process.env.SEED_SUPERVISOR_PASSWORD || "Supervisor123!",
  staff: process.env.SEED_STAFF_PASSWORD || "Staff123!",
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(AuditEntity) private readonly audit: Repository<AuditEntity>,
  ) {}

  async seed(): Promise<void> {
    if ((await this.users.count()) === 0) {
      await this.users.save([
        {
          name: "Dr. Ajibola",
          role: "admin",
          contact: "admin@clinic.co.za",
          status: "Active",
          lastLoginAt: null,
          passwordHash: await hashPassword(DEFAULT_SEED_PASSWORDS.admin!),
        },
        {
          name: "Sr. Naidoo",
          role: "supervisor",
          contact: "+27721111111",
          status: "Active",
          lastLoginAt: null,
          passwordHash: await hashPassword(DEFAULT_SEED_PASSWORDS.supervisor!),
        },
        {
          name: "Nurse Khumalo",
          role: "staff",
          contact: "+27730000000",
          status: "Active",
          lastLoginAt: null,
          passwordHash: await hashPassword(DEFAULT_SEED_PASSWORDS.staff!),
        },
      ]);
    } else {
      // Backfill: databases created before passwordHash existed get the
      // seeded defaults so credential login works after upgrade.
      const existing = await this.users.find();
      for (const u of existing) {
        if (!u.passwordHash) {
          u.passwordHash = await hashPassword(DEFAULT_SEED_PASSWORDS[u.role] ?? "ChangeMe123!");
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
