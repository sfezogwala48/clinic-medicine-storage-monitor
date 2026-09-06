import { ApiProperty } from "@nestjs/swagger";

export class PublishReadingDto {
  @ApiProperty({
    example: "fridge-01",
    description: "Storage device id (also encoded in the MQTT topic)",
  })
  deviceId!: string;

  @ApiProperty({ example: 4.5, minimum: -30, maximum: 80, description: "Temperature in Celsius" })
  temperatureC!: number;

  @ApiProperty({
    example: 60,
    minimum: 0,
    maximum: 100,
    description: "Relative humidity in percent",
  })
  humidityPct!: number;

  @ApiProperty({
    example: "2026-09-06T07:00:00.000Z",
    required: false,
    description: "ISO timestamp; defaults to server time when omitted",
  })
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
