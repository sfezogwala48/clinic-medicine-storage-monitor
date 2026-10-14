import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { sastDateTime } from "../core/time/sast.js";

@Entity("audit_entries")
export class AuditEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", transformer: sastDateTime })
  timestamp!: string;

  @Column()
  user!: string;

  @Column()
  action!: string;

  @Column()
  details!: string;
}
