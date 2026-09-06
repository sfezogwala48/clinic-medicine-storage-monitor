import { Column, Entity, Index, PrimaryColumn } from "typeorm";

export const ALERT_SEVERITIES = ["Critical", "High", "Medium"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_STATUSES = ["Active", "Resolved"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

@Entity("alerts")
@Index("idx_alerts_status", ["status"])
export class AlertEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  @Index()
  sensorId!: string;

  @Column()
  type!: string;

  @Column()
  value!: string;

  @Column({ type: "varchar" })
  severity!: AlertSeverity;

  @Column({ type: "varchar", default: "Active" })
  status!: AlertStatus;

  @Column({ type: "datetime" })
  occurredAt!: string;

  @Column({ type: "datetime", nullable: true })
  resolvedAt!: string | null;
}
