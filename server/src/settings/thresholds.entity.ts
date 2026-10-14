import { Column, Entity, PrimaryColumn } from "typeorm";
import { sastDateTime } from "../core/time/sast.js";

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

  /** Relative humidity (%) below which "Humidity Out of Range" fires. */
  @Column({ type: "float", default: 30 })
  humidityMin!: number;

  /** Relative humidity (%) above which "Humidity Out of Range" fires. */
  @Column({ type: "float", default: 60 })
  humidityMax!: number;

  /** How long a door may stay open before "Door Left Open" fires, in seconds. */
  @Column({ type: "float", default: 10 })
  doorOpenLimitSec!: number;

  @Column({ type: "varchar", transformer: sastDateTime })
  updatedAt!: string;
}
