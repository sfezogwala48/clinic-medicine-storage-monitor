import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

export class AlertDto {
  @ApiProperty({ example: "ALT001" }) id!: string;
  @ApiProperty({ example: "SEN001" }) sensorId!: string;
  @ApiProperty({ example: "High Temperature" }) type!: string;
  @ApiProperty({ example: "25.1°C" }) value!: string;
  @ApiProperty({ example: "2026-06-02T08:15:00.000Z", description: "ISO 8601 (UI formats it)" })
  time!: string;
  @ApiProperty({ enum: ["Critical", "High", "Medium"] }) severity!: string;
  @ApiProperty({ enum: ["Active", "Resolved"] }) status!: string;
}

export class AlertQueryDto {
  @ApiPropertyOptional({ enum: ["Active", "Resolved"] })
  @IsOptional()
  @IsIn(["Active", "Resolved"])
  status?: string;
}
