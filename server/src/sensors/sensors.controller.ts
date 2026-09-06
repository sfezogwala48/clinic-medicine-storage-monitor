import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  CreateSensorDto,
  SensorDto,
  SensorQueryDto,
  UpdateSensorDto,
} from "../sensors/sensor.dto.js";
import { SensorsService } from "../sensors/sensors.service.js";

function toDto(s: {
  id: string;
  type: string;
  location: string;
  model: string;
  status: string;
}): SensorDto {
  return { id: s.id, type: s.type, location: s.location, model: s.model, status: s.status };
}

@ApiTags("sensors")
@Controller("api/sensors")
export class SensorsController {
  constructor(private readonly sensors: SensorsService) {}

  @Get()
  @ApiOperation({ summary: "All sensors for the real-time view" })
  @ApiResponse({ status: 200, type: [SensorDto] })
  async list(@Query() q: SensorQueryDto): Promise<SensorDto[]> {
    return (await this.sensors.listSensors(q.type, q.status)).map(toDto);
  }

  @Post()
  @ApiOperation({ summary: "Registers a sensor in the fleet registry." })
  @ApiResponse({ status: 201, type: SensorDto })
  @ApiResponse({ status: 409, description: "Sensor id already registered." })
  async create(@Body() body: CreateSensorDto): Promise<SensorDto> {
    return toDto(await this.sensors.createSensor(body));
  }

  @Get(":id")
  @ApiOperation({ summary: "Single sensor by id." })
  @ApiResponse({ status: 200, type: SensorDto })
  @ApiResponse({ status: 404, description: "Sensor not found." })
  async getOne(@Param("id") id: string): Promise<SensorDto> {
    return toDto(await this.sensors.getSensor(id));
  }

  @Patch(":id")
  @ApiOperation({ summary: "Updates sensor metadata (location, model, status, container)." })
  @ApiResponse({ status: 200, type: SensorDto })
  @ApiResponse({ status: 404, description: "Sensor not found." })
  async update(@Param("id") id: string, @Body() body: UpdateSensorDto): Promise<SensorDto> {
    return toDto(await this.sensors.updateSensor(id, body));
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Decommissions a sensor. Historical readings are kept." })
  @ApiResponse({ status: 204, description: "Deleted." })
  @ApiResponse({ status: 404, description: "Sensor not found." })
  async remove(@Param("id") id: string): Promise<void> {
    await this.sensors.deleteSensor(id);
  }
}
