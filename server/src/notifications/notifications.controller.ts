import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { NotificationDto, NotificationQueryDto } from "./notification.dto.js";
import { NotificationEntity } from "./notification.entity.js";
import { NotificationsService } from "./notifications.service.js";

function toDto(n: NotificationEntity): NotificationDto {
  return { id: n.id, alertId: n.alertId, type: n.type, recipient: n.recipient, message: n.message };
}

@ApiTags("notifications")
@Controller("api/notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Notification log. Supports ?alertId=." })
  @ApiResponse({ status: 200, type: [NotificationDto] })
  async list(@Query() q: NotificationQueryDto): Promise<NotificationDto[]> {
    return (await this.notifications.list(q.alertId)).map(toDto);
  }
}
