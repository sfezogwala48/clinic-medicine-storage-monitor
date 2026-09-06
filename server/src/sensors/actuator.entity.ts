import { Column, Entity, PrimaryColumn } from "typeorm";

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

  @Column({ type: "datetime", nullable: true })
  lastSeenAt!: string | null;
}
