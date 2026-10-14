import { Column, Entity, PrimaryColumn } from "typeorm";
import { sastDateTime } from "../core/time/sast.js";

/**
 * Physical acting device (buzzer/siren). Deliberately separate from sensors:
 * actuators receive commands, sensors only publish telemetry. A buzzer serves
 * every sensor sharing its `location` — no sensor-id list is stored.
 */
@Entity("actuators")
export class ActuatorEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ type: "varchar", default: "Buzzer" })
  kind!: string;

  @Column()
  location!: string;

  @Column({ type: "varchar", default: "Active" })
  status!: string;

  @Column({ type: "varchar", transformer: sastDateTime, nullable: true })
  lastSeenAt!: string | null;
}
