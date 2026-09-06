import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CoreModule } from "./core/core.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { TelemetryModule } from "./telemetry/telemetry.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    CoreModule,
    DatabaseModule,
    HealthModule,
    TelemetryModule,
  ],
})
export class AppModule {}
