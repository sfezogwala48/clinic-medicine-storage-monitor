import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccessModule } from "./access/access.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { AlertsModule } from "./alerts/alerts.module.js";
import { CoreModule } from "./core/core.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { IngestModule } from "./ingest/ingest.module.js";
import { MqttModule } from "./mqtt/mqtt.module.js";
import { ReadingsModule } from "./readings/readings.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { SeedService } from "./seed/seed.service.js";
import { SensorsModule } from "./sensors/sensors.module.js";
import { SettingsModule } from "./settings/settings.module.js";
import { TelemetryModule } from "./telemetry/telemetry.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    CoreModule,
    DatabaseModule,
    AuthModule,
    MqttModule,
    HealthModule,
    TelemetryModule,
    SensorsModule,
    SettingsModule,
    UsersModule,
    NotificationsModule,
    AlertsModule,
    AccessModule,
    ReadingsModule,
    DashboardModule,
    IngestModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
