import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("audit_entries")
export class AuditEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "datetime" })
  timestamp!: string;

  @Column()
  user!: string;

  @Column()
  action!: string;

  @Column()
  details!: string;
}
