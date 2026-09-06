import { ConfigService } from "@nestjs/config";
import { Transport, type ClientOptions, type MqttOptions } from "@nestjs/microservices";

/** Injection token for the MQTT publish client. */
export const TELEMETRY_CLIENT = "TELEMETRY_CLIENT";

/** Subscribe pattern: one topic per storage device, e.g. clinic/storage/fridge-01/telemetry. */
export const TELEMETRY_TOPIC_PATTERN = "clinic/storage/+/telemetry";

/** Sensor uplink patterns (devices that sense, never receive commands). */
export const CLIMATE_PATTERN = "clinic/sensors/+/telemetry/climate";
export const DOOR_PATTERN = "clinic/sensors/+/telemetry/door";
export const SENSOR_STATUS_PATTERN = "clinic/sensors/+/status";

/** Actuator downlink pattern (devices that act, e.g. buzzer). Never under clinic/sensors/. */
export const BUZZER_COMMAND_PATTERN = "clinic/actuators/+/commands/buzzer";
export const BUZZER_STATUS_PATTERN = "clinic/actuators/+/status";

export const DEFAULT_MQTT_URL = "mqtt://localhost:1883";

export function mqttUrl(config: ConfigService): string {
  return config.get<string>("MQTT_URL", DEFAULT_MQTT_URL);
}

export function telemetryTopic(deviceId: string): string {
  return `clinic/storage/${deviceId}/telemetry`;
}

export function climateTopic(sensorId: string): string {
  return `clinic/sensors/${sensorId}/telemetry/climate`;
}

export function doorTopic(sensorId: string): string {
  return `clinic/sensors/${sensorId}/telemetry/door`;
}

/** Server -> actuator: command a buzzer. Actuator id is independent of sensor ids. */
export function buzzerCommandTopic(actuatorId: string): string {
  return `clinic/actuators/${actuatorId}/commands/buzzer`;
}

/** Server-side (subscriber) options for the hybrid microservice in main.ts. */
export function buildMqttOptions(config: ConfigService): MqttOptions {
  return {
    transport: Transport.MQTT,
    options: {
      url: mqttUrl(config),
      clientId: config.get<string>("MQTT_CLIENT_ID", `clinic-monitor-${process.pid}`),
    },
  };
}

/** Client-side (publisher) options for ClientsModule registration. */
export function buildMqttClientOptions(config: ConfigService): ClientOptions {
  return {
    transport: Transport.MQTT,
    options: {
      url: mqttUrl(config),
      clientId: `${config.get<string>("MQTT_CLIENT_ID", `clinic-monitor-${process.pid}`)}-pub`,
    },
  };
}
