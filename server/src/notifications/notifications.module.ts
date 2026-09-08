import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MqttModule } from "../mqtt/mqtt.module.js";
import { SensorsModule } from "../sensors/sensors.module.js";
import { SettingsModule } from "../settings/settings.module.js";
import { EmailController } from "./email.controller.js";
import { EmailService } from "./email.service.js";
import { NotificationEntity } from "./notification.entity.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]),
    SettingsModule,
    SensorsModule,
    MqttModule,
  ],
  controllers: [NotificationsController, EmailController],
  providers: [NotificationsService, EmailService],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
