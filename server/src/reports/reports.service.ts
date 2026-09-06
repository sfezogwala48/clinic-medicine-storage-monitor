import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccessService } from "../access/access.service.js";
import { AlertsService } from "../alerts/alerts.service.js";
import { ReportFileEntity } from "./report-file.entity.js";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReportFileEntity) private readonly files: Repository<ReportFileEntity>,
    private readonly access: AccessService,
    private readonly alerts: AlertsService,
  ) {}

  async seed(): Promise<void> {
    if ((await this.files.count()) === 0) {
      await this.files.save({
        name: "Daily_Report_2026-06-01.pdf",
        sizeBytes: 2_400_000,
        createdAt: new Date().toISOString(),
      });
    }
  }

  async summary(): Promise<{
    complianceScore: number;
    complianceTarget: number;
    totalAccessEvents: number;
    wastePrevented: string;
  }> {
    const totalAccessEvents = await this.access.count();
    const active = await this.alerts.list("Active");
    const complianceScore = active.length === 0 ? 98 : Math.max(70, 98 - active.length * 2);
    return { complianceScore, complianceTarget: 95, totalAccessEvents, wastePrevented: "R 12,500" };
  }

  async archive(): Promise<Array<{ name: string; size: string; downloadUrl: string }>> {
    const files = await this.files.find({ order: { createdAt: "DESC" } });
    return files.map((f) => ({
      name: f.name,
      size: formatBytes(f.sizeBytes),
      downloadUrl: `/api/reports/${f.name}`,
    }));
  }

  findFile(name: string): Promise<ReportFileEntity | null> {
    return this.files.findOne({ where: { name } });
  }
}
