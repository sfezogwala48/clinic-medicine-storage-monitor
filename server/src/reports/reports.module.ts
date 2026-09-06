import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessModule } from "../access/access.module.js";
import { AlertsModule } from "../alerts/alerts.module.js";
import { ReportFileEntity } from "./report-file.entity.js";
import { ReportsController } from "./reports.controller.js";
import { ReportsService } from "./reports.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([ReportFileEntity]), AccessModule, AlertsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
