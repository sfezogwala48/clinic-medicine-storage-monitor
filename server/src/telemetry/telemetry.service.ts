import { Injectable } from "@nestjs/common";
import { AppLogger } from "../core/logger/app-logger.service.js";
import type { Result } from "../core/result/result.js";
import { parseReading, type StorageReading } from "./reading.js";

@Injectable()
export class TelemetryService {
  private readonly latest = new Map<string, StorageReading>();

  constructor(private readonly logger: AppLogger) {}

  /** Validate, store, and acknowledge one inbound reading. */
  ingest(topic: string, payload: unknown): Result<StorageReading, Error> {
    return parseReading(topic, payload)
      .map((reading) => {
        this.latest.set(reading.deviceId, reading);
        this.logger.log(
          `device=${reading.deviceId} temp=${reading.temperatureC}C humidity=${reading.humidityPct}%`,
          "Telemetry",
        );
        return reading;
      })
      .mapErr((error) => {
        this.logger.warn(`Rejected reading on ${topic}: ${error.message}`, "Telemetry");
        return error;
      });
  }

  getLatest(): StorageReading[] {
    return [...this.latest.values()];
  }

  getLatestById(deviceId: string): StorageReading | undefined {
    return this.latest.get(deviceId);
  }
}
