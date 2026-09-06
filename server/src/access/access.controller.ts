import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AccessEventDto, AccessQueryDto } from "./access.dto.js";
import { AccessEventEntity } from "./access-event.entity.js";
import { AccessService } from "./access.service.js";

export function formatDuration(sec: number | null, open: boolean): string {
  if (!open) return "-";
  if (sec == null) return "-";
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${Math.round((sec / 3600) * 10) / 10}h`;
}

export function toAccessDto(e: AccessEventEntity): AccessEventDto {
  return {
    id: e.id,
    sensorId: e.sensorId,
    container: e.container,
    open: e.open,
    time: new Date(e.occurredAt).toISOString(),
    duration: formatDuration(e.durationSec, e.open),
    reason: e.reason,
  };
}

@ApiTags("access")
@Controller("api/access-log")
export class AccessController {
  constructor(private readonly access: AccessService) {}

  @Get()
  @ApiOperation({ summary: "Container access events, newest first. Supports ?limit=." })
  @ApiResponse({ status: 200, type: [AccessEventDto] })
  async list(@Query() q: AccessQueryDto): Promise<AccessEventDto[]> {
    return (await this.access.list(q.limit)).map(toAccessDto);
  }
}
