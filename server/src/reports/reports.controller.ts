import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { ReportFileDto, ReportSummaryDto } from "../settings/settings.dto.js";
import { ReportsService } from "./reports.service.js";

@ApiTags("reports")
@Controller("api/reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("summary")
  @ApiOperation({ summary: "Compliance score, access totals, waste prevented." })
  @ApiResponse({ status: 200, type: ReportSummaryDto })
  summary(): Promise<ReportSummaryDto> {
    return this.reports.summary();
  }

  @Get()
  @ApiOperation({ summary: "Generated reports archive." })
  @ApiResponse({ status: 200, type: [ReportFileDto] })
  archive(): Promise<ReportFileDto[]> {
    return this.reports.archive();
  }

  @Get(":name")
  @ApiOperation({ summary: "Download a generated report (placeholder PDF)." })
  async download(@Param("name") name: string, @Res() res: Response): Promise<void> {
    const file = await this.reports.findFile(name);
    if (!file) throw new NotFoundException(`Report "${name}" not found`);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
    res.send(`%PDF-1.4 placeholder for ${file.name}\n`);
  }
}
