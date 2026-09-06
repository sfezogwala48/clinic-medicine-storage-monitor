import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessModule } from "../access/access.module.js";
import { AlertsModule } from "../alerts/alerts.module.js";
import { SensorsModule } from "../sensors/sensors.module.js";
import { SettingsModule } from "../settings/settings.module.js";
import { ReadingEntity } from "./reading.entity.js";
import { ReadingsController } from "./readings.controller.js";
import { ReadingsService } from "./readings.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([ReadingEntity]),
    SensorsModule,
    AlertsModule,
    AccessModule,
    SettingsModule,
  ],
  controllers: [ReadingsController],
  providers: [ReadingsService],
  exports: [ReadingsService],
})
export class ReadingsModule {}
