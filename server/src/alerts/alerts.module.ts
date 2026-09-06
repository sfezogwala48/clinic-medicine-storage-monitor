import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { SettingsModule } from "../settings/settings.module.js";
import { UsersModule } from "../users/users.module.js";
import { AlertEntity } from "./alert.entity.js";
import { AlertsController } from "./alerts.controller.js";
import { AlertsService } from "./alerts.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertEntity]),
    SettingsModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
