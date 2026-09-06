import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

export class SensorDto {
  @ApiProperty({ example: "SEN001" }) id!: string;
  @ApiProperty({ enum: ["Temp/Humidity", "Magnetic Door"] }) type!: string;
  @ApiProperty({ example: "Medicine Storage Room A" }) location!: string;
  @ApiProperty({ example: "SHT31" }) model!: string;
  @ApiProperty({ enum: ["Active", "Inactive"] }) status!: string;
}

export class SensorQueryDto {
  @ApiPropertyOptional({ enum: ["Temp/Humidity", "Magnetic Door"] })
  @IsOptional()
  @IsIn(["Temp/Humidity", "Magnetic Door"])
  type?: string;

  @ApiPropertyOptional({ enum: ["Active", "Inactive"] })
  @IsOptional()
  @IsIn(["Active", "Inactive"])
  status?: string;
}
