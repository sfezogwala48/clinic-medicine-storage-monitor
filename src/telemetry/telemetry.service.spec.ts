import { describe, expect, it } from "vite-plus/test";
import { AppLogger } from "../core/logger/app-logger.service.js";
import { TelemetryService } from "./telemetry.service.js";

function createService() {
  const logger = new AppLogger();
  logger.setLogLevels([]);
  return new TelemetryService(logger);
}

describe("TelemetryService", () => {
  it("should store valid readings by device id", () => {
    const service = createService();

    const result = service.ingest("clinic/storage/fridge-01/telemetry", {
      deviceId: "fridge-01",
      temperatureC: 4.2,
      humidityPct: 58,
      recordedAt: "2026-09-06T07:00:00.000Z",
    });

    expect(result.isOk()).toBe(true);
    expect(service.getLatest()).toHaveLength(1);
    expect(service.getLatestById("fridge-01")).toEqual(
      expect.objectContaining({ temperatureC: 4.2 }),
    );
  });

  it("should reject invalid readings without storing them", () => {
    const service = createService();

    const result = service.ingest("clinic/storage/fridge-01/telemetry", {
      deviceId: "fridge-01",
      temperatureC: 999,
      humidityPct: 58,
    });

    expect(result.isErr()).toBe(true);
    expect(service.getLatest()).toHaveLength(0);
  });
});
