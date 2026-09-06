import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SensorDto, SensorQueryDto } from "../sensors/sensor.dto.js";
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
}
