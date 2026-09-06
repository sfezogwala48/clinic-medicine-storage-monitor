import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AlertsService } from "../alerts/alerts.service.js";
import { SensorsService } from "../sensors/sensors.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { AccessEventEntity } from "./access-event.entity.js";

@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(AccessEventEntity) private readonly events: Repository<AccessEventEntity>,
    private readonly sensors: SensorsService,
    private readonly settings: SettingsService,
    private readonly alerts: AlertsService,
  ) {}

  list(limit?: number): Promise<AccessEventEntity[]> {
    return this.events.find({ order: { occurredAt: "DESC" }, ...(limit ? { take: limit } : {}) });
  }

  count(): Promise<number> {
    return this.events.count();
  }

  private nextId(): string {
    return `CST${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
      .toString(36)
      .toUpperCase()
      .padStart(2, "0")}`;
  }

  /** Record a door transition; pairs open->close to fill durationSec on the open event. */
  async recordDoor(
    sensorId: string,
    containerOpen: boolean,
    at: string,
  ): Promise<AccessEventEntity> {
    const sensor = await this.sensors.ensureSensor(sensorId, "Magnetic Door");
    const container = sensor.container ?? sensor.location;
    const event = await this.events.save({
      id: this.nextId(),
      sensorId,
      container,
      open: containerOpen,
      occurredAt: at,
      durationSec: null,
      reason: "Staff access",
    });
    if (!containerOpen) {
      // Close: find the latest unmatched open event for this sensor and pair it.
      const openEvent = await this.events.findOne({
        where: { sensorId, open: true },
        order: { occurredAt: "DESC" },
      });
      if (openEvent && openEvent.durationSec == null && openEvent.id !== event.id) {
        const secs = Math.max(
          0,
          (new Date(at).getTime() - new Date(openEvent.occurredAt).getTime()) / 1000,
        );
        openEvent.durationSec = Math.round(secs);
        await this.events.save(openEvent);
        event.durationSec = null;
      }
    } else {
      const t = await this.settings.getThresholds();
      // Prolonged-open check uses the previous open event duration if available.
      const prev = await this.events.findOne({
        where: { sensorId, open: true },
        order: { occurredAt: "DESC" },
      });
      if (
        prev &&
        prev.id !== event.id &&
        prev.durationSec != null &&
        prev.durationSec >= t.doorOpenLimitMin * 60
      ) {
        await this.alerts.evaluateDoorOpen(sensorId, prev.durationSec / 60, container);
      }
    }
    return event;
  }
}
