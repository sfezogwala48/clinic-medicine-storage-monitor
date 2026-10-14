import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import { sastDateTime } from "../core/time/sast.js";

@Entity("notifications")
@Index("idx_notifications_alert", ["alertId"])
export class NotificationEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  alertId!: string;

  @Column({ type: "varchar" })
  type!: string;

  @Column()
  recipient!: string;

  @Column()
  message!: string;

  @Column({ type: "varchar", transformer: sastDateTime })
  sentAt!: string;
}
