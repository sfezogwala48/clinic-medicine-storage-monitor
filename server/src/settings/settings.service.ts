import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationSettingsEntity } from "./notification-settings.entity.js";
import { ThresholdsEntity } from "./thresholds.entity.js";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(ThresholdsEntity) private readonly thresholds: Repository<ThresholdsEntity>,
    @InjectRepository(NotificationSettingsEntity)
    private readonly notif: Repository<NotificationSettingsEntity>,
  ) {}

  async seed(): Promise<void> {
    if ((await this.thresholds.count()) === 0) {
      await this.thresholds.save({
        id: 1,
        fridgeMin: 2,
        fridgeMax: 8,
        roomMax: 25,
        doorOpenLimitMin: 5,
        updatedAt: new Date().toISOString(),
      });
    }
    if ((await this.notif.count()) === 0) {
      await this.notif.save({
        id: 1,
        buzzerEnabled: true,
        emailEnabled: false,
        recipients: [],
        updatedAt: new Date().toISOString(),
      });
    }
  }

  getThresholds(): Promise<ThresholdsEntity> {
    return this.thresholds.findOneByOrFail({ id: 1 });
  }

  async saveThresholds(patch: {
    fridgeMin: number;
    fridgeMax: number;
    roomMax: number;
    doorOpenLimitMin: number;
  }): Promise<ThresholdsEntity> {
    const current = await this.getThresholds();
    return this.thresholds.save({
      id: current.id,
      fridgeMin: patch.fridgeMin,
      fridgeMax: patch.fridgeMax,
      roomMax: patch.roomMax,
      doorOpenLimitMin: patch.doorOpenLimitMin,
      updatedAt: new Date().toISOString(),
    });
  }

  getNotificationSettings(): Promise<NotificationSettingsEntity> {
    return this.notif.findOneByOrFail({ id: 1 });
  }

  async saveNotificationSettings(patch: {
    buzzerEnabled: boolean;
    emailEnabled: boolean;
    recipients: string[];
  }): Promise<NotificationSettingsEntity> {
    const current = await this.getNotificationSettings();
    return this.notif.save({
      id: current.id,
      buzzerEnabled: patch.buzzerEnabled,
      emailEnabled: patch.emailEnabled,
      recipients: patch.recipients,
      updatedAt: new Date().toISOString(),
    });
  }
}
