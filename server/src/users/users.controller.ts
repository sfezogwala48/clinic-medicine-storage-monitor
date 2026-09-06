import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuditEntity } from "./audit.entity.js";
import { AuditDto, CreateUserDto, LoginDto, UserDto } from "./user.dto.js";
import { UserEntity } from "./user.entity.js";
import { UsersService } from "./users.service.js";

function toUserDto(u: UserEntity): UserDto {
  return {
    name: u.name,
    role: u.role,
    contact: u.contact ?? "",
    lastLogin: u.lastLoginAt,
    status: u.status,
  };
}

function toAuditDto(a: AuditEntity): AuditDto {
  return {
    timestamp: new Date(a.timestamp).toISOString().replace("T", " ").slice(0, 19),
    user: a.user,
    action: a.action,
    details: a.details,
  };
}

@ApiTags("auth")
@Controller("api/auth")
export class AuthController {
  constructor(private readonly users: UsersService) {}

  @Post("login")
  @ApiOperation({ summary: "Demo role login; returns a token and the user profile." })
  async login(@Body() body: LoginDto): Promise<{ token: string; user: UserDto }> {
    const user = await this.users.loginAs(body.role as UserEntity["role"]);
    return { token: `demo-${user.role}-${user.id}`, user: toUserDto(user) };
  }
}

@ApiTags("users")
@Controller("api")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("users")
  @ApiOperation({ summary: "System users table." })
  @ApiResponse({ status: 200, type: [UserDto] })
  async list(): Promise<UserDto[]> {
    return (await this.users.listUsers()).map(toUserDto);
  }

  @Post("users")
  @ApiOperation({ summary: "Creates a user (defaults to staff role)." })
  @ApiResponse({ status: 201, type: UserDto })
  async create(@Body() body: CreateUserDto): Promise<UserDto> {
    return toUserDto(await this.users.createUser(body));
  }

  @Get("audit-trail")
  @ApiOperation({ summary: "Audit trail table." })
  @ApiResponse({ status: 200, type: [AuditDto] })
  async audit(@Query("limit") limit?: string): Promise<AuditDto[]> {
    const take = Math.min(Math.max(Number(limit) || 100, 1), 500);
    return (await this.users.auditTrail(take)).map(toAuditDto);
  }
}
