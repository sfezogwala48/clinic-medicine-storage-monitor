import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class UserDto {
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
}

export class LoginDto {
  @ApiProperty({ enum: ["admin", "supervisor", "staff"] })
  @IsIn(["admin", "supervisor", "staff"])
  role!: string;
}

export class AuditDto {
  @ApiProperty({ example: "2026-06-02 09:45:20" }) timestamp!: string;
  @ApiProperty({ example: "System" }) user!: string;
  @ApiProperty({ example: "Alert Triggered" }) action!: string;
  @ApiProperty({ example: "Unauthorized Access SEN006" }) details!: string;
}
