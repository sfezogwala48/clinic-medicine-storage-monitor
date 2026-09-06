import type { MqttContext } from "@nestjs/microservices";
import { describe, expect, it } from "vite-plus/test";
import { AppLogger } from "../core/logger/app-logger.service.js";
import { TelemetryController } from "./telemetry.controller.js";
import { TelemetryService } from "./telemetry.service.js";

function createController() {
  const logger = new AppLogger();
  logger.setLogLevels([]);
  return new TelemetryController(new TelemetryService(logger));
}

function contextFor(topic: string) {
  return { getPacket: () => ({ topic, payload: {} }) } as unknown as MqttContext;
}

describe("TelemetryController", () => {
  it("should acknowledge a valid reading", () => {
    const controller = createController();

    const ack = controller.handleTelemetry(
      { deviceId: "fridge-01", temperatureC: 4, humidityPct: 60 },
      contextFor("clinic/storage/fridge-01/telemetry"),
    );

    expect(ack).toEqual({ received: true, deviceId: "fridge-01" });
  });

  it("should negatively acknowledge an invalid reading", () => {
    const controller = createController();

    const ack = controller.handleTelemetry(
      { deviceId: "fridge-01" },
      contextFor("clinic/storage/fridge-01/telemetry"),
    );

    expect(ack).toEqual(expect.objectContaining({ received: false }));
  });
});
