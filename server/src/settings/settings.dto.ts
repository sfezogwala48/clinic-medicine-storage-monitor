import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsNumber, IsString } from "class-validator";

export class ThresholdsDto {
  @ApiProperty({ example: 2 }) @IsNumber() fridgeMin!: number;
  @ApiProperty({ example: 8 }) @IsNumber() fridgeMax!: number;
  @ApiProperty({ example: 25 }) @IsNumber() roomMax!: number;
  @ApiProperty({ example: 5 }) @IsNumber() doorOpenLimitMin!: number;
}

export class NotificationSettingsDto {
  @ApiProperty({ example: true }) @IsBoolean() smsEnabled!: boolean;
  @ApiProperty({ example: true }) @IsBoolean() buzzerEnabled!: boolean;
  @ApiProperty({ example: false }) @IsBoolean() emailEnabled!: boolean;
  @ApiProperty({ example: ["+27731234567"] })
  @IsArray()
  @IsString({ each: true })
  recipients!: string[];
}

export class DashboardSummaryDto {
  @ApiProperty({ example: 22.5 }) avgTemperature!: number;
  @ApiProperty({ example: 45.2 }) avgHumidity!: number;
  @ApiProperty({ example: { min: 30, max: 60 } }) humidityRange!: { min: number; max: number };
  @ApiProperty({ example: 2 }) activeAlerts!: number;
  @ApiProperty({ example: 1 }) criticalCount!: number;
  @ApiProperty({ example: 1 }) highCount!: number;
  @ApiProperty({ enum: ["Online", "Offline", "Degraded"] }) systemStatus!: string;
  @ApiProperty({ example: "2026-06-02T08:15:00.000Z" }) lastSync!: string;
}
