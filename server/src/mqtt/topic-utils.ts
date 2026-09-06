/** Extract `{sensorId}` from clinic/sensors/<id>/telemetry/<kind> or .../status. */
export function sensorIdFromSensorTopic(topic: string): string | undefined {
  const match = /^clinic\/sensors\/([^/]+)\/(telemetry\/(climate|door)|status)$/.exec(topic);
  return match?.[1];
}

/** Extract `{actuatorId}` from clinic/actuators/<id>/commands/buzzer or .../status. */
export function actuatorIdFromTopic(topic: string): string | undefined {
  const match = /^clinic\/actuators\/([^/]+)\/(commands\/buzzer|status)$/.exec(topic);
  return match?.[1];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** MQTT payloads may arrive as Buffer, JSON string, or already-parsed object. */
export function parseMqttJson(payload: unknown): Record<string, unknown> | undefined {
  if (Buffer.isBuffer(payload)) {
    try {
      const parsed: unknown = JSON.parse(payload.toString("utf8") as string);
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  if (typeof payload === "string") {
    try {
      const parsed: unknown = JSON.parse(payload);
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return isRecord(payload) ? payload : undefined;
}
