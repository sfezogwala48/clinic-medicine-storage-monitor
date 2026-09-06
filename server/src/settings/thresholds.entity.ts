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

  @Column({ type: "float" })
  doorOpenLimitMin!: number;

  @Column({ type: "datetime" })
  updatedAt!: string;
}
