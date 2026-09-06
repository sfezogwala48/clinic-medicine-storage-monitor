import { Module } from "@nestjs/common";
import { MqttModule } from "../mqtt/mqtt.module.js";
import { TelemetryController } from "./telemetry.controller.js";
import { TelemetryHttpController } from "./telemetry.http-controller.js";
import { TelemetryService } from "./telemetry.service.js";

@Module({
  imports: [MqttModule],
  controllers: [TelemetryController, TelemetryHttpController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
