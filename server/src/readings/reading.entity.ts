import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

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

  @Column({ type: "datetime" })
  recordedAt!: string;

  @Column({ type: "datetime" })
  receivedAt!: string;
}
