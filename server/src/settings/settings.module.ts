import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MqttModule } from "../mqtt/mqtt.module.js";
import { NotificationSettingsEntity } from "./notification-settings.entity.js";
import { SettingsController } from "./settings.controller.js";
import { SettingsService } from "./settings.service.js";
import { ThresholdsEntity } from "./thresholds.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([ThresholdsEntity, NotificationSettingsEntity]), MqttModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
