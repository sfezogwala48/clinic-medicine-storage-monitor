import { ApiProperty } from "@nestjs/swagger";
import { IsISO8601, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class PublishReadingDto {
  @ApiProperty({
    example: "fridge-01",
    description: "Storage device id (also encoded in the MQTT topic)",
  })
  @IsString()
  deviceId!: string;

  @ApiProperty({ example: 4.5, minimum: -30, maximum: 80, description: "Temperature in Celsius" })
  @IsNumber()
  @Min(-30)
  @Max(80)
  temperatureC!: number;

  @ApiProperty({
    example: 60,
    minimum: 0,
    maximum: 100,
    description: "Relative humidity in percent",
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  humidityPct!: number;

  @ApiProperty({
    example: "2026-09-06T07:00:00.000Z",
    required: false,
    description: "ISO timestamp; defaults to server time when omitted",
  })
  @IsOptional()
  @IsISO8601()
  recordedAt?: string;
}

export class ReadingDto {
  @ApiProperty({ example: "fridge-01" })
  deviceId!: string;

  @ApiProperty({ example: 4.5 })
  temperatureC!: number;

  @ApiProperty({ example: 60 })
  humidityPct!: number;

  @ApiProperty({ example: "2026-09-06T07:00:00.000Z" })
  recordedAt!: string;
}

export class PublishAckDto {
  @ApiProperty({ example: true })
  published!: boolean;

  @ApiProperty({ example: { received: true, deviceId: "fridge-01" } })
  ack!: Record<string, unknown>;
}
