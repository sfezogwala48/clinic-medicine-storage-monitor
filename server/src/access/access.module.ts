import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AlertsModule } from "../alerts/alerts.module.js";
import { SensorsModule } from "../sensors/sensors.module.js";
import { SettingsModule } from "../settings/settings.module.js";
import { AccessEventEntity } from "./access-event.entity.js";
import { AccessController } from "./access.controller.js";
import { AccessService } from "./access.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([AccessEventEntity]),
    SensorsModule,
    SettingsModule,
    AlertsModule,
  ],
  controllers: [AccessController],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
