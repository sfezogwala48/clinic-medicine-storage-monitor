import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class UserDto {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: "Dr. Ajibola" }) name!: string;
  @ApiProperty({ enum: ["admin", "supervisor", "staff"] }) role!: string;
  @ApiProperty({ example: "admin@clinic.co.za" }) contact!: string;
  @ApiProperty({ example: "2026-06-02T08:00:00.000Z" }) lastLogin!: string | null;
  @ApiProperty({ enum: ["Active", "Disabled"] }) status!: string;
}

export class CreateUserDto {
  @ApiProperty({ example: "Nurse Khumalo" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ enum: ["admin", "supervisor", "staff"], default: "staff" })
  @IsOptional()
  @IsIn(["admin", "supervisor", "staff"])
  role?: string;

  @ApiPropertyOptional({ example: "+27730000000" })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional({
    description: "Initial password (min 8 chars). Omitted → server generates a temporary one.",
    example: "Staff123!",
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "Nurse Khumalo" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ["admin", "supervisor", "staff"] })
  @IsOptional()
  @IsIn(["admin", "supervisor", "staff"])
  role?: string;

  @ApiPropertyOptional({ example: "+27730000000" })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional({ enum: ["Active", "Disabled"] })
  @IsOptional()
  @IsIn(["Active", "Disabled"])
  status?: string;

  @ApiPropertyOptional({ description: "Admin reset: replaces the password.", minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

/**
 * @deprecated Role-only login was the insecure demo path. Use
 * POST /api/auth/login {identifier, password} instead. Kept in the schema
 * only so old clients get a clear 400 pointing at the new endpoint.
 */
export class LegacyRoleLoginDto {
  @ApiProperty({ enum: ["admin", "supervisor", "staff"] })
  @IsIn(["admin", "supervisor", "staff"])
  role!: string;
}

/** Back-compat alias: old clients POSTed {role}. */
export const LoginDto = LegacyRoleLoginDto;

export class AuditDto {
  @ApiProperty({ example: "2026-06-02 09:45:20" }) timestamp!: string;
  @ApiProperty({ example: "System" }) user!: string;
  @ApiProperty({ example: "Alert Triggered" }) action!: string;
  @ApiProperty({ example: "Unauthorized Access SEN006" }) details!: string;
}
