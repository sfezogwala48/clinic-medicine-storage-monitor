import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("thresholds")
export class ThresholdsEntity {
  @PrimaryColumn()
  id!: number;

  @Column({ type: "float" })
  fridgeMin!: number;

  @Column({ type: "float" })
  fridgeMax!: number;

  @Column({ type: "float" })
  roomMax!: number;

  /** How long a door may stay open before "Door Left Open" fires, in seconds. */
  @Column({ type: "float", default: 10 })
  doorOpenLimitSec!: number;

  @Column({ type: "datetime" })
  updatedAt!: string;
}
