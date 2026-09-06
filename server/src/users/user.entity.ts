import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export const ROLES = ["admin", "supervisor", "staff"] as const;
export type Role = (typeof ROLES)[number];

@Entity("users")
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: "varchar", default: "staff" })
  role!: Role;

  @Column({ type: "varchar", nullable: true })
  contact!: string | null;

  @Column({ type: "varchar", default: "Active" })
  status!: string;

  @Column({ type: "datetime", nullable: true })
  lastLoginAt!: string | null;
}
