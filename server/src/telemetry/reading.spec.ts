import { describe, expect, it } from "vite-plus/test";
import { deviceIdFromTopic, normalizeDeviceTimestamp, parseReading } from "./reading.js";

const TOPIC = "clinic/storage/fridge-01/telemetry";

describe("deviceIdFromTopic", () => {
  it("should extract the device id from a telemetry topic", () => {
    expect(deviceIdFromTopic(TOPIC)).toBe("fridge-01");
  });

  it("should return undefined for non-telemetry topics", () => {
    expect(deviceIdFromTopic("clinic/storage/fridge-01/other")).toBeUndefined();
    expect(deviceIdFromTopic("")).toBeUndefined();
  });
});

describe("normalizeDeviceTimestamp", () => {
  it("should stamp a naive device timestamp as SAST", () => {
    expect(normalizeDeviceTimestamp("2026-09-06T08:15:00")).toBe("2026-09-06T08:15:00+02:00");
  });

  it("should trust a timestamp that already carries a zone", () => {
    expect(normalizeDeviceTimestamp("2026-09-06T08:15:00Z")).toBe("2026-09-06T08:15:00Z");
    expect(normalizeDeviceTimestamp("2026-09-06T08:15:00+02:00")).toBe("2026-09-06T08:15:00+02:00");
  });
});

describe("parseReading", () => {
  it("should treat a naive recordedAt as SAST so the device clock is preserved", () => {
    const result = parseReading(TOPIC, {
      deviceId: "fridge-01",
      temperatureC: 4.5,
      humidityPct: 60,
      recordedAt: "2026-09-06T08:15:00",
    });

    expect(result._unsafeUnwrap().recordedAt).toBe("2026-09-06T08:15:00+02:00");
  });

  it("should accept a valid object payload", () => {
    const result = parseReading(TOPIC, {
      deviceId: "fridge-01",
      temperatureC: 4.5,
      humidityPct: 60,
      recordedAt: "2026-09-06T07:00:00.000Z",
    });

    expect(result._unsafeUnwrap()).toEqual({
      deviceId: "fridge-01",
      temperatureC: 4.5,
      humidityPct: 60,
      recordedAt: "2026-09-06T07:00:00.000Z",
    });
  });

  it("should accept a JSON string payload and fall back to the topic device id", () => {
    const result = parseReading(
      TOPIC,
      JSON.stringify({ temperatureC: 5, humidityPct: 55, recordedAt: "2026-09-06T07:00:00.000Z" }),
    );

    expect(result._unsafeUnwrap()).toEqual(
      expect.objectContaining({ deviceId: "fridge-01", temperatureC: 5, humidityPct: 55 }),
    );
  });

  it("should reject out-of-range temperatures", () => {
    const result = parseReading(TOPIC, {
      deviceId: "fridge-01",
      temperatureC: 200,
      humidityPct: 50,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toContain("temperatureC");
  });

  it("should reject a missing device id when the topic has none either", () => {
    const result = parseReading("unrelated/topic", { temperatureC: 5, humidityPct: 50 });

    expect(result._unsafeUnwrapErr().message).toContain("deviceId");
  });

  it("should reject malformed JSON", () => {
    const result = parseReading(TOPIC, "{not json");

    expect(result.isErr()).toBe(true);
  });
});
