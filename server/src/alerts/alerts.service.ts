import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppLogger } from "../core/logger/app-logger.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { UsersService } from "../users/users.service.js";
import { AlertEntity } from "./alert.entity.js";

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertEntity) private readonly alerts: Repository<AlertEntity>,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly users: UsersService,
    private readonly logger: AppLogger,
  ) {}

  list(status?: string): Promise<AlertEntity[]> {
    return this.alerts.find({
      where: status ? { status: status as AlertEntity["status"] } : {},
      order: { occurredAt: "DESC" },
    });
  }

  activeCountForSensor(sensorId: string): Promise<number> {
    return this.alerts.count({ where: { sensorId, status: "Active" } });
  }

  private nextId(): string {
    return `ALT${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
      .toString(36)
      .toUpperCase()
      .padStart(2, "0")}`;
  }

  async raise(input: {
    sensorId: string;
    type: string;
    value: string;
    severity: AlertEntity["severity"];
  }): Promise<AlertEntity> {
    // Dedup: don't spam a new row if the same active alert already exists.
    const existing = await this.alerts.findOne({
      where: { sensorId: input.sensorId, type: input.type, status: "Active" },
    });
    if (existing) return existing;
    const alert = await this.alerts.save({
      id: this.nextId(),
      ...input,
      status: "Active",
      occurredAt: new Date().toISOString(),
      resolvedAt: null,
    });
    this.logger.warn(`Alert ${alert.id}: ${alert.type} on ${alert.sensorId}`, "Alerts");
    await this.users
      .record("System", "Alert Triggered", `${alert.type} ${alert.sensorId}`)
      .catch(() => undefined);
    await this.notifications.dispatchForAlert(alert);
    return alert;
  }

  /** Rule evaluation for one climate sample. Returns raised alerts (usually 0-1). */
  async evaluateClimate(
    sensorId: string,
    temp: number,
    humidity: number,
    container: string | null,
  ): Promise<AlertEntity[]> {
    const t = await this.settings.getThresholds();
    const raised: AlertEntity[] = [];
    const isFridge = /fridge/i.test(container ?? "");
    if (isFridge && temp > t.fridgeMax) {
      raised.push(
        await this.raise({
          sensorId,
          type: "High Temperature",
          value: `${temp}°C`,
          severity: "Critical",
        }),
      );
    } else if (isFridge && temp < t.fridgeMin) {
      raised.push(
        await this.raise({
          sensorId,
          type: "Low Temperature",
          value: `${temp}°C`,
          severity: "High",
        }),
      );
    } else if (!isFridge && temp > t.roomMax) {
      raised.push(
        await this.raise({
          sensorId,
          type: "High Temperature",
          value: `${temp}°C`,
          severity: "High",
        }),
      );
    }
    if (humidity < 30 || humidity > 60) {
      raised.push(
        await this.raise({
          sensorId,
          type: "Humidity Out of Range",
          value: `${humidity}%`,
          severity: "Medium",
        }),
      );
    }
    return raised;
  }

  async evaluateDoorOpen(
    sensorId: string,
    openMinutes: number,
    container: string,
  ): Promise<AlertEntity[]> {
    const t = await this.settings.getThresholds();
    if (openMinutes >= t.doorOpenLimitMin) {
      return [
        await this.raise({
          sensorId,
          type: "Door Left Open",
          value: `${container} open ${Math.round(openMinutes)}m`,
          severity: "High",
        }),
      ];
    }
    return [];
  }

  async acknowledge(id: string): Promise<AlertEntity | null> {
    const alert = await this.alerts.findOne({ where: { id } });
    if (!alert) return null;
    if (alert.status === "Active") {
      alert.status = "Resolved";
      alert.resolvedAt = new Date().toISOString();
      await this.alerts.save(alert);
      await this.notifications.silenceForSensor(alert.sensorId);
      await this.users
        .record("System", "Alert Acknowledged", `${alert.id} ${alert.sensorId}`)
        .catch(() => undefined);
    }
    return alert;
  }
}
