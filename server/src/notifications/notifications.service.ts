import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppLogger } from "../core/logger/app-logger.service.js";
import { MqttPublishService } from "../mqtt/mqtt-publish.service.js";
import { buzzerCommandTopic } from "../mqtt/mqtt.options.js";
import { SensorsService } from "../sensors/sensors.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { NotificationEntity } from "./notification.entity.js";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
    private readonly settings: SettingsService,
    private readonly sensors: SensorsService,
    private readonly mqtt: MqttPublishService,
    private readonly logger: AppLogger,
  ) {}

  list(alertId?: string): Promise<NotificationEntity[]> {
    return this.notifications.find({
      where: alertId ? { alertId } : {},
      order: { id: "DESC" },
    });
  }

  private nextId(prefix: string): string {
    return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
      .toString(36)
      .toUpperCase()
      .padStart(2, "0")}`;
  }

  /** Fan-out for a new alert: SMS rows per recipient + buzzer command per actuator at the sensor's location. */
  async dispatchForAlert(alert: {
    id: string;
    sensorId: string;
    type: string;
    severity: string;
  }): Promise<void> {
    const settings = await this.settings.getNotificationSettings();
    const sentAt = new Date().toISOString();
    const message = `ALERT: ${alert.type} on ${alert.sensorId} (${alert.severity})`;

    if (settings.smsEnabled) {
      for (const recipient of settings.recipients) {
        await this.notifications.save({
          id: this.nextId("NOT"),
          alertId: alert.id,
          type: "SMS",
          recipient,
          message,
          sentAt,
        });
      }
    }

    if (settings.buzzerEnabled) {
      const sensor = await this.sensors.findSensor(alert.sensorId);
      const location = sensor?.location ?? "Unassigned";
      const actuators = await this.sensors.actuatorsForLocation(location);
      for (const actuator of actuators) {
        await this.mqtt.publish(buzzerCommandTopic(actuator.id), {
          actuatorId: actuator.id,
          on: true,
          alertId: alert.id,
          pattern: "continuous",
        });
        await this.notifications.save({
          id: this.nextId("NOT"),
          alertId: alert.id,
          type: "Buzzer",
          recipient: actuator.id,
          message: `Buzzer ON at ${location}: ${alert.type}`,
          sentAt,
        });
      }
    }
    this.logger.log(`Dispatched notifications for ${alert.id}`, "Notifications");
  }

  /** Silence all buzzers at the alert sensor's location (on acknowledge). */
  async silenceForSensor(sensorId: string): Promise<void> {
    const sensor = await this.sensors.findSensor(sensorId);
    const actuators = await this.sensors.actuatorsForLocation(sensor?.location ?? "Unassigned");
    for (const actuator of actuators) {
      await this.mqtt.publish(buzzerCommandTopic(actuator.id), {
        actuatorId: actuator.id,
        on: false,
        pattern: "off",
      });
    }
  }
}
