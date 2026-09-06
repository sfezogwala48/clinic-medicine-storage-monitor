import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuditEntity } from "./audit.entity.js";
import { AuditDto, CreateUserDto, LoginDto, UpdateUserDto, UserDto } from "./user.dto.js";
import { UserEntity } from "./user.entity.js";
import { UsersService } from "./users.service.js";

function toUserDto(u: UserEntity): UserDto {
  return {
    id: u.id,
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

  @Get("users/:id")
  @ApiOperation({ summary: "Single system user by id." })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 404, description: "User not found." })
  async getOne(@Param("id", ParseIntPipe) id: number): Promise<UserDto> {
    return toUserDto(await this.users.getUser(id));
  }

  @Patch("users/:id")
  @ApiOperation({ summary: "Partially updates a system user." })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 404, description: "User not found." })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
  ): Promise<UserDto> {
    return toUserDto(await this.users.updateUser(id, body));
  }

  @Delete("users/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletes a system user." })
  @ApiResponse({ status: 204, description: "Deleted." })
  @ApiResponse({ status: 404, description: "User not found." })
  async remove(@Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.users.deleteUser(id);
  }

  @Get("audit-trail")
  @ApiOperation({ summary: "Audit trail table." })
  @ApiResponse({ status: 200, type: [AuditDto] })
  async audit(@Query("limit") limit?: string): Promise<AuditDto[]> {
    const take = Math.min(Math.max(Number(limit) || 100, 1), 500);
    return (await this.users.auditTrail(take)).map(toAuditDto);
  }
}
