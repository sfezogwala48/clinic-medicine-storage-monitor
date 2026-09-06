import { Controller, Get, NotFoundException, Param, Patch } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Query } from "@nestjs/common";
import { AlertDto, AlertQueryDto } from "./alert.dto.js";
import { AlertEntity } from "./alert.entity.js";
import { AlertsService } from "./alerts.service.js";

function toDto(a: AlertEntity): AlertDto {
  return {
    id: a.id,
    sensorId: a.sensorId,
    type: a.type,
    value: a.value,
    time: new Date(a.occurredAt).toISOString(),
    severity: a.severity,
    status: a.status,
  };
}

@ApiTags("alerts")
@Controller("api/alerts")
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  @ApiOperation({ summary: "Alerts list. Supports ?status=Active." })
  @ApiResponse({ status: 200, type: [AlertDto] })
  async list(@Query() q: AlertQueryDto): Promise<AlertDto[]> {
    return (await this.alerts.list(q.status)).map(toDto);
  }

  @Patch(":id/acknowledge")
  @ApiOperation({ summary: "Marks an alert Resolved; stops further notifications." })
  @ApiResponse({ status: 200, type: AlertDto })
  async acknowledge(@Param("id") id: string): Promise<AlertDto> {
    const alert = await this.alerts.acknowledge(id);
    if (!alert) throw new NotFoundException(`Alert "${id}" not found`);
    return toDto(alert);
  }
}
