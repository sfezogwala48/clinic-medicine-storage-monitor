import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("report_files")
export class ReportFileEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column()
  sizeBytes!: number;

  @Column({ type: "datetime" })
  createdAt!: string;
}
