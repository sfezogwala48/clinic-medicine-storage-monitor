import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AlertEntity } from "../alerts/alert.entity.js";
import { ReadingEntity } from "../readings/reading.entity.js";
import { SensorEntity } from "../sensors/sensor.entity.js";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(ReadingEntity) private readonly readings: Repository<ReadingEntity>,
    @InjectRepository(AlertEntity) private readonly alerts: Repository<AlertEntity>,
    @InjectRepository(SensorEntity) private readonly sensors: Repository<SensorEntity>,
  ) {}

  async summary(): Promise<{
    avgTemperature: number;
    avgHumidity: number;
    humidityRange: { min: number; max: number };
    activeAlerts: number;
    criticalCount: number;
    highCount: number;
    systemStatus: string;
    lastSync: string;
  }> {
    const latest = await this.readings.find({ order: { recordedAt: "DESC" }, take: 50 });
    const temps = latest.map((r) => r.temp).filter((t): t is number => t != null);
    const hums = latest.map((r) => r.humidity).filter((h): h is number => h != null);
    const avg = (xs: number[]) =>
      xs.length === 0 ? 0 : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
    const [active, critical, high, sensorCount, inactive] = await Promise.all([
      this.alerts.count({ where: { status: "Active" } }),
      this.alerts.count({ where: { status: "Active", severity: "Critical" } }),
      this.alerts.count({ where: { status: "Active", severity: "High" } }),
      this.sensors.count(),
      this.sensors.count({ where: { status: "Inactive" } }),
    ]);
    const systemStatus =
      sensorCount === 0 || inactive === sensorCount
        ? "Offline"
        : inactive > 0 || critical > 0
          ? "Degraded"
          : "Online";
    return {
      avgTemperature: avg(temps),
      avgHumidity: avg(hums),
      humidityRange: { min: 30, max: 60 },
      activeAlerts: active,
      criticalCount: critical,
      highCount: high,
      systemStatus,
      lastSync: latest[0]?.recordedAt ?? new Date().toISOString(),
    };
  }
}
