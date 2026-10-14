import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { sastDateTime } from "../core/time/sast.js";

/** One persisted device sample. Climate rows set temp/humidity; door rows set containerOpen. */
@Entity("readings")
@Index("idx_readings_sensor_time", ["sensorId", "recordedAt"])
export class ReadingEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  sensorId!: string;

  @Column({ type: "float", nullable: true })
  temp!: number | null;

  @Column({ type: "float", nullable: true })
  humidity!: number | null;

  @Column({ type: "boolean", nullable: true })
  containerOpen!: boolean | null;

  @Column({ type: "varchar", transformer: sastDateTime })
  recordedAt!: string;

  @Column({ type: "varchar", transformer: sastDateTime })
  receivedAt!: string;
}
