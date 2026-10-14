import { Column, Entity, PrimaryColumn } from "typeorm";
import { sastDateTime } from "../core/time/sast.js";

@Entity("notification_settings")
export class NotificationSettingsEntity {
  @PrimaryColumn()
  id!: number;

  @Column()
  buzzerEnabled!: boolean;

  @Column()
  emailEnabled!: boolean;

  @Column({ type: "simple-json" })
  recipients!: string[];

  @Column({ type: "varchar", transformer: sastDateTime })
  updatedAt!: string;
}
