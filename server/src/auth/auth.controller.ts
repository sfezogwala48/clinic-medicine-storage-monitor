import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "./jwt-auth.guard.js";
import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AuthService } from "./auth.service.js";
import { Public } from "./public.decorator.js";

export class LoginDto {
  @ApiProperty({
    description: "Contact (email/phone) or display name",
    example: "admin@clinic.co.za",
  })
  @IsString()
  identifier!: string;

  @ApiProperty({ example: "Admin123!", minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    description: "When the client pre-selected a user type, the account must have this role.",
    enum: ["admin", "supervisor", "staff"],
  })
  @IsOptional()
  @IsIn(["admin", "supervisor", "staff"])
  role?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: "Admin123!" })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: "NewSecure123!", minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

@ApiTags("auth")
@Controller("api/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Credential login; returns a JWT and the user profile." })
  @ApiResponse({ status: 200, description: "Authenticated." })
  @ApiResponse({ status: 401, description: "Invalid credentials." })
  async login(@Body() body: LoginDto) {
    const raw = body as Partial<LoginDto>;
    if ((!raw.identifier || !raw.password) && raw.role && !raw.identifier) {
      throw new BadRequestException("Enter your username and password to sign in.");
    }
    return this.auth.login(body.identifier, body.password, body.role);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Current user from the Bearer token." })
  async me(@Req() req: AuthenticatedRequest) {
    if (!req.user) throw new UnauthorizedException("Missing bearer token");
    return this.auth.me(req.user.id);
  }

  @Post("change-password")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change the current user's password." })
  async changePassword(@Req() req: AuthenticatedRequest, @Body() body: ChangePasswordDto) {
    if (!req.user) throw new UnauthorizedException("Missing bearer token");
    await this.auth.changePassword(req.user.id, body.currentPassword, body.newPassword);
    return { changed: true };
  }
}
