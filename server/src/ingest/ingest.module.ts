import { Module } from "@nestjs/common";
import { ReadingsModule } from "../readings/readings.module.js";
import { SensorsModule } from "../sensors/sensors.module.js";
import { TelemetryModule } from "../telemetry/telemetry.module.js";
import { IngestMqttController } from "./ingest.mqtt-controller.js";

@Module({
  imports: [ReadingsModule, SensorsModule, TelemetryModule],
  controllers: [IngestMqttController],
})
export class IngestModule {}
