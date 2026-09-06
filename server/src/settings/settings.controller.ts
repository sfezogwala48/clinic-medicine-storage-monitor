import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { MqttPublishService } from "../mqtt/mqtt-publish.service.js";
import { NotificationSettingsEntity } from "./notification-settings.entity.js";
import { NotificationSettingsDto, ThresholdsDto } from "./settings.dto.js";
import { SettingsService } from "./settings.service.js";
import { ThresholdsEntity } from "./thresholds.entity.js";

function thresholdsToDto(t: ThresholdsEntity): ThresholdsDto {
  return {
    fridgeMin: t.fridgeMin,
    fridgeMax: t.fridgeMax,
    roomMax: t.roomMax,
    doorOpenLimitMin: t.doorOpenLimitMin,
  };
}

function notifToDto(n: NotificationSettingsEntity): NotificationSettingsDto {
  return {
    smsEnabled: n.smsEnabled,
    buzzerEnabled: n.buzzerEnabled,
    emailEnabled: n.emailEnabled,
    recipients: n.recipients,
  };
}

@ApiTags("settings")
@Controller("api")
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly mqtt: MqttPublishService,
  ) {}

  @Get("thresholds")
  @ApiOperation({ summary: "Current alert thresholds." })
  @ApiResponse({ status: 200, type: ThresholdsDto })
  async getThresholds(): Promise<ThresholdsDto> {
    return thresholdsToDto(await this.settings.getThresholds());
  }

  @Put("thresholds")
  @ApiOperation({ summary: "Replaces alert thresholds." })
  @ApiResponse({ status: 200, type: ThresholdsDto })
  async saveThresholds(@Body() body: ThresholdsDto): Promise<ThresholdsDto> {
    const saved = await this.settings.saveThresholds(body);
    // Push to actuators so edge rules stay in sync (best-effort).
    await this.mqtt.publish("clinic/actuators/all/config/thresholds", thresholdsToDto(saved));
    return thresholdsToDto(saved);
  }

  @Get("notification-settings")
  @ApiOperation({ summary: "Channel toggles and recipients." })
  @ApiResponse({ status: 200, type: NotificationSettingsDto })
  async getNotif(): Promise<NotificationSettingsDto> {
    return notifToDto(await this.settings.getNotificationSettings());
  }

  @Put("notification-settings")
  @ApiOperation({ summary: "Replaces channel toggles and recipients." })
  @ApiResponse({ status: 200, type: NotificationSettingsDto })
  async saveNotif(@Body() body: NotificationSettingsDto): Promise<NotificationSettingsDto> {
    return notifToDto(await this.settings.saveNotificationSettings(body));
  }
}
