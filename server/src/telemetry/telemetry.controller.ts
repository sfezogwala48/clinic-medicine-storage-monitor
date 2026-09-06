import { Controller } from "@nestjs/common";
import { Ctx, MessagePattern, MqttContext, Payload } from "@nestjs/microservices";
import { TELEMETRY_TOPIC_PATTERN } from "../mqtt/mqtt.options.js";
import { TelemetryService } from "./telemetry.service.js";

interface MqttPacketShape {
  topic?: unknown;
}

@Controller()
export class TelemetryController {
  constructor(private readonly telemetry: TelemetryService) {}

  @MessagePattern(TELEMETRY_TOPIC_PATTERN)
  handleTelemetry(@Payload() payload: unknown, @Ctx() context: MqttContext) {
    const packet = context.getPacket() as MqttPacketShape;
    const topic = typeof packet?.topic === "string" ? packet.topic : "";
    return this.telemetry.ingest(topic, payload).match(
      (reading) => ({ received: true, deviceId: reading.deviceId }),
      (error) => ({ received: false, error: error.message }),
    );
  }
}
