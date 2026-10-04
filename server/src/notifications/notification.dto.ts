import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class NotificationDto {
  @ApiProperty({ example: "NOT007" }) id!: string;
  @ApiProperty({ example: "ALT006" }) alertId!: string;
  @ApiProperty({ enum: ["Buzzer", "Email", "Email (failed)"] }) type!: string;
  @ApiProperty({ example: "+27731234567" }) recipient!: string;
  @ApiProperty({ example: "ALERT: Vaccine Container unauthorized access detected" })
  message!: string;
}

export class NotificationQueryDto {
  @ApiPropertyOptional({ example: "ALT006" })
  @IsOptional()
  @IsString()
  alertId?: string;
}

/** Server -> actuator payload for clinic/actuators/{id}/commands/buzzer. */
export class BuzzerCommandDto {
  @ApiProperty({ example: "BUZ-A" }) actuatorId!: string;
  @ApiProperty({ example: true }) on!: boolean;
  @ApiPropertyOptional({ example: "ALT006" }) alertId?: string;
  @ApiPropertyOptional({
    example: "beep",
    description: '"beep" (pulsed, the default for alerts), "continuous" (solid tone) or "off"',
  })
  pattern?: string;
}
