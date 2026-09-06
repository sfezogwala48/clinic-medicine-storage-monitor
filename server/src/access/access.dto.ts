import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class AccessEventDto {
  @ApiProperty({ example: "CST002" }) id!: string;
  @ApiProperty({ example: "SEN005" }) sensorId!: string;
  @ApiProperty({ example: "Medicine Cabinet A" }) container!: string;
  @ApiProperty({ example: true }) open!: boolean;
  @ApiProperty({ example: "2026-06-02T08:15:30.000Z" }) time!: string;
  @ApiProperty({ example: "5m" }) duration!: string;
  @ApiProperty({ example: "Staff access" }) reason!: string;
}

export class AccessQueryDto {
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
