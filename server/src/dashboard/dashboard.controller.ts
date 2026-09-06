import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service.js";
import { DashboardSummaryDto } from "../settings/settings.dto.js";

@ApiTags("dashboard")
@Controller("api/dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("summary")
  @ApiOperation({ summary: "Stat cards for the dashboard overview." })
  @ApiResponse({ status: 200, type: DashboardSummaryDto })
  summary(): Promise<DashboardSummaryDto> {
    return this.dashboard.summary() as Promise<DashboardSummaryDto>;
  }
}
