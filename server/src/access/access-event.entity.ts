import { Column, Entity, Index, PrimaryColumn } from "typeorm";

/** Door open/close event. `time`/`duration` display strings are derived from occurredAt/durationSec. */
@Entity("access_events")
@Index("idx_access_time", ["occurredAt"])
export class AccessEventEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  @Index()
  sensorId!: string;

  @Column()
  container!: string;

  @Column()
  open!: boolean;

  @Column({ type: "datetime" })
  occurredAt!: string;

  /** Seconds the container stayed open (open events only, paired on close). */
  @Column({ type: "float", nullable: true })
  durationSec!: number | null;

  @Column({ default: "Staff access" })
  reason!: string;
}
