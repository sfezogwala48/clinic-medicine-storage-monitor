import { Column, Entity, Index, PrimaryColumn } from "typeorm";

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

  @Column({ type: "datetime" })
  sentAt!: string;
}
