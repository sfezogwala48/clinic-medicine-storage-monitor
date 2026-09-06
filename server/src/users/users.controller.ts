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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/roles.decorator.js";
import { AuditEntity } from "./audit.entity.js";
import { AuditDto, CreateUserDto, UpdateUserDto, UserDto } from "./user.dto.js";
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

@ApiTags("users")
@ApiBearerAuth()
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
  @Roles("admin")
  @ApiOperation({ summary: "Creates a user (admin only; defaults to staff role)." })
  @ApiResponse({ status: 201, description: "Created user (+ temporaryPassword when generated)." })
  async create(@Body() body: CreateUserDto) {
    const { user, temporaryPassword } = await this.users.createUser(body);
    return { ...toUserDto(user), ...(temporaryPassword ? { temporaryPassword } : {}) };
  }

  @Get("users/:id")
  @ApiOperation({ summary: "Single system user by id." })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 404, description: "User not found." })
  async getOne(@Param("id", ParseIntPipe) id: number): Promise<UserDto> {
    return toUserDto(await this.users.getUser(id));
  }

  @Patch("users/:id")
  @Roles("admin")
  @ApiOperation({ summary: "Partially updates a system user (admin only)." })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 404, description: "User not found." })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
  ): Promise<UserDto> {
    return toUserDto(await this.users.updateUser(id, body));
  }

  @Delete("users/:id")
  @Roles("admin")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletes a system user (admin only)." })
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
