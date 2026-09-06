import { Column, Entity, PrimaryColumn } from "typeorm";

export const SENSOR_TYPES = ["Temp/Humidity", "Magnetic Door"] as const;
export type SensorType = (typeof SENSOR_TYPES)[number];

export const SENSOR_STATUS = ["Active", "Inactive"] as const;
export type SensorStatus = (typeof SENSOR_STATUS)[number];

/** Physical sensing device. `id` matches the UI contract (SEN001…). */
@Entity("sensors")
export class SensorEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ type: "varchar" })
  type!: SensorType;

  @Column()
  location!: string;

  @Column()
  model!: string;

  @Column({ type: "varchar", default: "Active" })
  status!: SensorStatus;

  /** Friendly container this sensor guards (e.g. "Medicine Cabinet A"). */
  @Column({ type: "varchar", nullable: true })
  container!: string | null;

  @Column({ type: "datetime", nullable: true })
  lastSeenAt!: string | null;
}
