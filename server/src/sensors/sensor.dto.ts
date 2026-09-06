import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class SensorDto {
  @ApiProperty({ example: "SEN001" }) id!: string;
  @ApiProperty({ enum: ["Temp/Humidity", "Magnetic Door"] }) type!: string;
  @ApiProperty({ example: "Medicine Storage Room A" }) location!: string;
  @ApiProperty({ example: "SHT31" }) model!: string;
  @ApiProperty({ enum: ["Active", "Inactive"] }) status!: string;
}

export class CreateSensorDto {
  @ApiProperty({ example: "SEN004" })
  @IsString()
  id!: string;

  @ApiProperty({ enum: ["Temp/Humidity", "Magnetic Door"] })
  @IsIn(["Temp/Humidity", "Magnetic Door"])
  type!: string;

  @ApiProperty({ example: "Medicine Storage Room A" })
  @IsString()
  location!: string;

  @ApiProperty({ example: "SHT31" })
  @IsString()
  model!: string;

  @ApiPropertyOptional({ enum: ["Active", "Inactive"], default: "Active" })
  @IsOptional()
  @IsIn(["Active", "Inactive"])
  status?: string;

  @ApiPropertyOptional({ example: "Medicine Cabinet A" })
  @IsOptional()
  @IsString()
  container?: string;
}

export class UpdateSensorDto {
  @ApiPropertyOptional({ example: "Medicine Storage Room B" })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: "SHT31" })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ enum: ["Active", "Inactive"] })
  @IsOptional()
  @IsIn(["Active", "Inactive"])
  status?: string;

  @ApiPropertyOptional({ example: "Medicine Cabinet A" })
  @IsOptional()
  @IsString()
  container?: string;
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
