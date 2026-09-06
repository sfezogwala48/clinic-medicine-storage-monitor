import { Controller } from "@nestjs/common";
import { Ctx, MessagePattern, MqttContext, Payload } from "@nestjs/microservices";
import {
  BUZZER_STATUS_PATTERN,
  CLIMATE_PATTERN,
  DOOR_PATTERN,
  SENSOR_STATUS_PATTERN,
  TELEMETRY_TOPIC_PATTERN,
} from "../mqtt/mqtt.options.js";
import {
  actuatorIdFromTopic,
  parseMqttJson,
  sensorIdFromSensorTopic,
} from "../mqtt/topic-utils.js";
import { ReadingsService } from "../readings/readings.service.js";
import { SensorsService } from "../sensors/sensors.service.js";
import { deviceIdFromTopic } from "../telemetry/reading.js";
import { TelemetryService } from "../telemetry/telemetry.service.js";

interface MqttPacketShape {
  topic?: unknown;
}

/** MQTT ingress: sensors publish telemetry/status, actuators publish status acks. */
@Controller()
export class IngestMqttController {
  constructor(
    private readonly readings: ReadingsService,
    private readonly sensors: SensorsService,
    private readonly legacy: TelemetryService,
  ) {}

  private topic(ctx: MqttContext): string {
    const packet = ctx.getPacket() as MqttPacketShape;
    return typeof packet?.topic === "string" ? packet.topic : "";
  }

  @MessagePattern(CLIMATE_PATTERN)
  async handleClimate(@Payload() payload: unknown, @Ctx() ctx: MqttContext) {
    const topic = this.topic(ctx);
    const data = parseMqttJson(payload) ?? {};
    const result = await this.readings.ingestClimate({
      sensorId: typeof data.sensorId === "string" ? data.sensorId : undefined,
      temp: (data.temp as number) ?? (data.temperatureC as number),
      humidity: data.humidity as number,
      recordedAt: data.recordedAt,
      topicSensorId: sensorIdFromSensorTopic(topic),
    });
    return result.match(
      (r) => ({ received: true, deviceId: r.sensorId }),
      (e) => ({ received: false, error: e.message }),
    );
  }

  @MessagePattern(DOOR_PATTERN)
  async handleDoor(@Payload() payload: unknown, @Ctx() ctx: MqttContext) {
    const topic = this.topic(ctx);
    const data = parseMqttJson(payload) ?? {};
    const result = await this.readings.ingestDoor({
      sensorId: typeof data.sensorId === "string" ? data.sensorId : undefined,
      containerOpen: data.containerOpen,
      recordedAt: data.recordedAt,
      topicSensorId: sensorIdFromSensorTopic(topic),
    });
    return result.match(
      (r) => ({ received: true, deviceId: r.sensorId }),
      (e) => ({ received: false, error: e.message }),
    );
  }

  @MessagePattern(SENSOR_STATUS_PATTERN)
  async handleSensorStatus(@Payload() payload: unknown, @Ctx() ctx: MqttContext) {
    const topic = this.topic(ctx);
    const id = sensorIdFromSensorTopic(topic);
    const data = parseMqttJson(payload) ?? {};
    if (!id) return { received: false, error: "Unparseable sensor topic" };
    if (data.online === false) await this.sensors.markInactive(id);
    else await this.sensors.markSeen(id);
    return { received: true, deviceId: id };
  }

  @MessagePattern(BUZZER_STATUS_PATTERN)
  async handleBuzzerStatus(@Payload() payload: unknown, @Ctx() ctx: MqttContext) {
    const topic = this.topic(ctx);
    const id = actuatorIdFromTopic(topic);
    if (!id) return { received: false, error: "Unparseable actuator topic" };
    await this.sensors.markActuatorSeen(id);
    return { received: true, actuatorId: id };
  }

  /** Legacy alias so existing `clinic/storage/+/telemetry` firmware keeps working. */
  @MessagePattern(TELEMETRY_TOPIC_PATTERN)
  async handleLegacy(@Payload() payload: unknown, @Ctx() ctx: MqttContext) {
    const topic = this.topic(ctx);
    const data = parseMqttJson(payload) ?? {};
    const deviceId = typeof data.deviceId === "string" ? data.deviceId : deviceIdFromTopic(topic);
    // Mirror into the legacy in-memory service (keeps /telemetry/latest working).
    this.legacy.ingest(topic, { ...data, deviceId });
    if (deviceId && typeof (data.temperatureC ?? data.temp) === "number") {
      const result = await this.readings.ingestClimate({
        sensorId: deviceId,
        temp: (data.temperatureC ?? data.temp) as number,
        humidity: (data.humidityPct ?? data.humidity) as number,
        recordedAt: data.recordedAt,
        topicSensorId: deviceId,
      });
      return result.match(
        (r) => ({ received: true, deviceId: r.sensorId }),
        (e) => ({ received: false, error: e.message }),
      );
    }
    return { received: false, error: "Legacy payload needs numeric temperatureC/humidityPct" };
  }
}
