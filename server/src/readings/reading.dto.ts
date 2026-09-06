import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

/** Device -> server: climate sample. sensorId may be omitted (falls back to MQTT topic). */
export class ClimateIngestDto {
  @ApiPropertyOptional({ example: "SEN001" })
  @IsOptional()
  @IsString()
  sensorId?: string;

  @ApiProperty({ example: 25.1 })
  @IsNumber()
  @Min(-30)
  @Max(80)
  temp!: number;

  @ApiProperty({ example: 49 })
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity!: number;

  @ApiPropertyOptional({ example: "2026-06-02T08:15:00.000Z" })
  @IsOptional()
  @IsString()
  recordedAt?: string;
}

/** Device -> server: door sample. */
export class DoorIngestDto {
  @ApiPropertyOptional({ example: "SEN005" })
  @IsOptional()
  @IsString()
  sensorId?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  containerOpen!: boolean;

  @ApiPropertyOptional({ example: "2026-06-02T08:15:30.000Z" })
  @IsOptional()
  @IsString()
  recordedAt?: string;
}

/** Server -> UI: latest reading per sensor (union shape from api-schema SensorReading). */
export class SensorReadingDto {
  @ApiProperty({ example: "SEN001" }) sensorId!: string;
  @ApiPropertyOptional({ example: 25.1 }) temp?: number;
  @ApiPropertyOptional({ example: 49 }) humidity?: number;
  @ApiPropertyOptional({ example: false }) containerOpen?: boolean;
  @ApiProperty({ enum: ["Normal", "Warning", "Critical"] }) status!: string;
  @ApiProperty({ example: 0 }) alerts!: number;
}

export class TempTrendQueryDto {
  @ApiProperty({ example: "SEN001" })
  @IsString()
  sensorId!: string;

  @ApiProperty({ example: "24h", required: false })
  @IsOptional()
  @IsString()
  range?: string;
}

export class TemperatureSeriesDto {
  @ApiProperty({ example: "SEN001" }) sensorId!: string;
  @ApiProperty({ example: "°C" }) unit!: string;
  @ApiProperty({ example: 120 }) intervalMinutes!: number;
  @ApiProperty({ example: 25 }) limit!: number;
  @ApiProperty({ example: [22, 23, 24] }) points!: number[];
}
