import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditEntity } from "./audit.entity.js";
import type { UpdateUserDto } from "./user.dto.js";
import { UserEntity } from "./user.entity.js";

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
        },
        {
          name: "Sr. Naidoo",
          role: "supervisor",
          contact: "+27721111111",
          status: "Active",
          lastLoginAt: null,
        },
        {
          name: "Nurse Khumalo",
          role: "staff",
          contact: "+27730000000",
          status: "Active",
          lastLoginAt: null,
        },
      ]);
    }
  }

  listUsers(): Promise<UserEntity[]> {
    return this.users.find({ order: { id: "ASC" } });
  }

  async createUser(input: { name: string; role?: string; contact?: string }): Promise<UserEntity> {
    const user = await this.users.save({
      name: input.name,
      role: (input.role ?? "staff") as UserEntity["role"],
      contact: input.contact ?? null,
      status: "Active",
      lastLoginAt: null,
    });
    await this.record("System", "User Created", `${user.name} (${user.role})`);
    return user;
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
    const saved = await this.users.save(user);
    await this.record("System", "User Updated", `${saved.name} (id ${saved.id})`);
    return saved;
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.getUser(id);
    await this.users.remove(user);
    await this.record("System", "User Deleted", `${user.name} (id ${user.id})`);
  }

  /** Demo role login: touches the most recent user with that role (or creates one). */
  async loginAs(role: UserEntity["role"]): Promise<UserEntity> {
    let user = await this.users.findOne({ where: { role }, order: { id: "ASC" } });
    user ??= await this.users.save({
      name: `${role[0]?.toUpperCase()}${role.slice(1)} User`,
      role,
      contact: null,
      status: "Active",
      lastLoginAt: null,
    });
    user.lastLoginAt = new Date().toISOString();
    await this.users.save(user);
    await this.record(user.name, "Login", `Role login as ${role}`);
    return user;
  }

  record(user: string, action: string, details: string): Promise<AuditEntity> {
    return this.audit.save({ user, action, details, timestamp: new Date().toISOString() });
  }

  auditTrail(limit = 100): Promise<AuditEntity[]> {
    return this.audit.find({ order: { id: "DESC" }, take: limit });
  }
}
