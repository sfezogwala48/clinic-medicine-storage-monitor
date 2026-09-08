import { Column, Entity, PrimaryColumn } from "typeorm";

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

  @Column({ type: "datetime" })
  updatedAt!: string;
}
