import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccessService } from "../access/access.service.js";
import { AlertsService } from "../alerts/alerts.service.js";
import { AppLogger } from "../core/logger/app-logger.service.js";
import { err, ok, type Result } from "../core/result/result.js";
import { SensorsService } from "../sensors/sensors.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { ReadingEntity } from "./reading.entity.js";

export interface ClimateSample {
  sensorId: string;
  temp: number;
  humidity: number;
  recordedAt: string;
}
export interface DoorSample {
  sensorId: string;
  containerOpen: boolean;
  recordedAt: string;
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function coerceRecordedAt(value: unknown): string {
  return validDate(value) ? (value as string) : new Date().toISOString();
}

@Injectable()
export class ReadingsService {
  constructor(
    @InjectRepository(ReadingEntity) private readonly readings: Repository<ReadingEntity>,
    private readonly sensors: SensorsService,
    private readonly alerts: AlertsService,
    private readonly access: AccessService,
    private readonly settings: SettingsService,
    private readonly logger: AppLogger,
  ) {}

  /** Validate + persist one climate sample, then run threshold rules. */
  async ingestClimate(input: {
    sensorId?: string;
    temp: unknown;
    humidity: unknown;
    recordedAt?: unknown;
    topicSensorId?: string;
  }): Promise<Result<ReadingEntity, Error>> {
    const sensorId =
      typeof input.sensorId === "string" && input.sensorId !== ""
        ? input.sensorId
        : input.topicSensorId;
    if (!sensorId) return err(new Error("Climate sample requires a sensorId (payload or topic)"));
    if (
      typeof input.temp !== "number" ||
      Number.isNaN(input.temp) ||
      input.temp < -30 ||
      input.temp > 80
    ) {
      return err(new Error(`temp ${String(input.temp)} out of range (-30..80)`));
    }
    if (
      typeof input.humidity !== "number" ||
      Number.isNaN(input.humidity) ||
      input.humidity < 0 ||
      input.humidity > 100
    ) {
      return err(new Error(`humidity ${String(input.humidity)} out of range (0..100)`));
    }
    const recordedAt = coerceRecordedAt(input.recordedAt);
    const sensor = await this.sensors.ensureSensor(sensorId, "Temp/Humidity");
    await this.sensors.markSeen(sensorId, "Temp/Humidity");
    const reading = await this.readings.save({
      sensorId,
      temp: input.temp,
      humidity: input.humidity,
      containerOpen: null,
      recordedAt,
      receivedAt: new Date().toISOString(),
    });
    this.logger.log(
      `device=${sensorId} temp=${input.temp}C humidity=${input.humidity}%`,
      "Readings",
    );
    await this.alerts
      .evaluateClimate(sensorId, input.temp, input.humidity, sensor.container)
      .catch((e: unknown) => {
        this.logger.warn(
          `Rule evaluation failed: ${e instanceof Error ? e.message : String(e)}`,
          "Readings",
        );
      });
    return ok(reading);
  }

  /** Validate + persist one door sample, then record the access event. */
  async ingestDoor(input: {
    sensorId?: string;
    containerOpen: unknown;
    recordedAt?: unknown;
    topicSensorId?: string;
  }): Promise<Result<ReadingEntity, Error>> {
    const sensorId =
      typeof input.sensorId === "string" && input.sensorId !== ""
        ? input.sensorId
        : input.topicSensorId;
    if (!sensorId) return err(new Error("Door sample requires a sensorId (payload or topic)"));
    if (typeof input.containerOpen !== "boolean")
      return err(new Error("Door sample requires a boolean containerOpen"));
    const recordedAt = coerceRecordedAt(input.recordedAt);
    await this.sensors.ensureSensor(sensorId, "Magnetic Door");
    await this.sensors.markSeen(sensorId, "Magnetic Door");
    const reading = await this.readings.save({
      sensorId,
      temp: null,
      humidity: null,
      containerOpen: input.containerOpen,
      recordedAt,
      receivedAt: new Date().toISOString(),
    });
    await this.access.recordDoor(sensorId, input.containerOpen, recordedAt);
    return ok(reading);
  }

  /** Latest reading per sensor (for GET /api/readings). Small fleet => in-memory dedup. */
  async latestPerSensor(): Promise<
    Array<{
      sensorId: string;
      temp?: number;
      humidity?: number;
      containerOpen?: boolean;
      recordedAt: string;
    }>
  > {
    const all = await this.readings.find({ order: { recordedAt: "DESC" } });
    const seen = new Map<string, ReadingEntity>();
    for (const row of all) if (!seen.has(row.sensorId)) seen.set(row.sensorId, row);
    return [...seen.values()].map((r) => ({
      sensorId: r.sensorId,
      ...(r.temp != null ? { temp: r.temp } : {}),
      ...(r.humidity != null ? { humidity: r.humidity } : {}),
      ...(r.containerOpen != null ? { containerOpen: r.containerOpen } : {}),
      recordedAt: r.recordedAt,
    }));
  }

  /** Downsampled temperature series for the trend chart (newest-first rows -> oldest-first points). */
  async temperatureSeries(
    sensorId: string,
    range = "24h",
  ): Promise<{
    sensorId: string;
    unit: string;
    intervalMinutes: number;
    limit: number;
    points: number[];
  }> {
    const hours = range === "7d" ? 24 * 7 : 24;
    const sinceMs = Date.now() - hours * 3600_000;
    const rows = await this.readings.find({ where: { sensorId }, order: { recordedAt: "ASC" } });
    const inRange = rows.filter(
      (r) => r.temp != null && new Date(r.recordedAt).getTime() >= sinceMs,
    );
    const source = inRange.length > 0 ? inRange : rows.filter((r) => r.temp != null).slice(-12);
    const intervalMinutes = Math.max(5, Math.round((hours * 60) / 12));
    const points = source.map((r) => Number((r.temp as number).toFixed(1)));
    const limit = await this.settings
      .getThresholds()
      .then((t) => t.roomMax)
      .catch(() => 25);
    return { sensorId, unit: "°C", intervalMinutes, limit, points };
  }
}
