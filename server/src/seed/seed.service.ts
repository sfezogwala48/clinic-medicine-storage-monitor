import { Injectable, OnModuleInit } from "@nestjs/common";
import { AppLogger } from "../core/logger/app-logger.service.js";
import { ReportsService } from "../reports/reports.service.js";
import { SensorsService } from "../sensors/sensors.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { UsersService } from "../users/users.service.js";

/** Seeds lookup data (sensors, actuators, thresholds, users) on first boot. */
@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    private readonly sensors: SensorsService,
    private readonly settings: SettingsService,
    private readonly users: UsersService,
    private readonly reports: ReportsService,
    private readonly logger: AppLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.sensors.seed();
      await this.settings.seed();
      await this.users.seed();
      await this.reports.seed();
    } catch (error) {
      this.logger.warn(
        `Seed skipped: ${error instanceof Error ? error.message : String(error)}`,
        "Seed",
      );
    }
  }
}
