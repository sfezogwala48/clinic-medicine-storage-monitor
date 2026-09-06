import { err, ok, safeCall, type Result } from "../core/result/result.js";

export interface StorageReading {
  deviceId: string;
  temperatureC: number;
  humidityPct: number;
  recordedAt: string;
}

const DEVICE_TOPIC_PREFIX = "clinic/storage/";
const DEVICE_TOPIC_SUFFIX = "/telemetry";

/** Extract the device id from a topic like clinic/storage/<deviceId>/telemetry. */
export function deviceIdFromTopic(topic: string): string | undefined {
  if (!topic.startsWith(DEVICE_TOPIC_PREFIX) || !topic.endsWith(DEVICE_TOPIC_SUFFIX)) {
    return undefined;
  }
  const deviceId = topic.slice(DEVICE_TOPIC_PREFIX.length, -DEVICE_TOPIC_SUFFIX.length);
  return deviceId === "" ? undefined : deviceId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePayload(payload: unknown): Result<Record<string, unknown>, Error> {
  if (Buffer.isBuffer(payload)) {
    return safeCall(() => JSON.parse(payload.toString("utf8") as string) as unknown).andThen(
      (parsed) =>
        isRecord(parsed) ? ok(parsed) : err(new Error("Telemetry payload must be a JSON object")),
    );
  }
  if (typeof payload === "string") {
    return safeCall(() => JSON.parse(payload) as unknown).andThen((parsed) =>
      isRecord(parsed) ? ok(parsed) : err(new Error("Telemetry payload must be a JSON object")),
    );
  }
  if (isRecord(payload)) {
    return ok(payload);
  }
  return err(new Error("Telemetry payload must be a JSON object"));
}

/**
 * Validate an inbound reading. The device id may come from the payload or,
 * as a fallback, from the MQTT topic the message arrived on.
 */
export function parseReading(topic: string, payload: unknown): Result<StorageReading, Error> {
  return parsePayload(payload).andThen((data) => {
    const fromTopic = deviceIdFromTopic(topic);
    const deviceId =
      typeof data.deviceId === "string" && data.deviceId !== "" ? data.deviceId : fromTopic;
    if (deviceId === undefined) {
      return err(new Error("Telemetry reading requires a deviceId (payload or topic)"));
    }
    if (typeof data.temperatureC !== "number" || Number.isNaN(data.temperatureC)) {
      return err(new Error("Telemetry reading requires a numeric temperatureC"));
    }
    if (data.temperatureC < -30 || data.temperatureC > 80) {
      return err(new Error(`temperatureC ${data.temperatureC} out of range (-30..80)`));
    }
    if (typeof data.humidityPct !== "number" || Number.isNaN(data.humidityPct)) {
      return err(new Error("Telemetry reading requires a numeric humidityPct"));
    }
    if (data.humidityPct < 0 || data.humidityPct > 100) {
      return err(new Error(`humidityPct ${data.humidityPct} out of range (0..100)`));
    }
    const recordedAt =
      typeof data.recordedAt === "string" ? data.recordedAt : new Date().toISOString();
    if (Number.isNaN(Date.parse(recordedAt))) {
      return err(new Error(`recordedAt "${recordedAt}" is not a valid date`));
    }
    return ok({
      deviceId,
      temperatureC: data.temperatureC,
      humidityPct: data.humidityPct,
      recordedAt,
    });
  });
}
