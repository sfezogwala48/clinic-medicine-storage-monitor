import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientsModule } from "@nestjs/microservices";
import { TELEMETRY_CLIENT, buildMqttClientOptions } from "../mqtt/mqtt.options.js";
import { TelemetryController } from "./telemetry.controller.js";
import { TelemetryHttpController } from "./telemetry.http-controller.js";
import { TelemetryService } from "./telemetry.service.js";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: TELEMETRY_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => buildMqttClientOptions(config),
      },
    ]),
  ],
  controllers: [TelemetryController, TelemetryHttpController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
