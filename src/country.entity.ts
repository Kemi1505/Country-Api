import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("countries")
export class Country {
  @PrimaryGeneratedColumn({ type: "int", unsigned: true })
  id: number;

  @Column({ type: "varchar", length: 255, unique: true })
  name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  capital: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  region: string | null;

  @Column({ type: "bigint", unsigned: true, nullable: true })
  population: number | null;

  @Column({ type: "varchar", length: 10, nullable: true })
  currency_code: string | null;

  @Column({ type: "double", nullable: true })
  exchange_rate: number | null;

  @Column({ type: "double", nullable: true })
  estimated_gdp: number | null;

  @Column({ type: "text", nullable: true })
  flag_url: string | null;

  @Column({ type: "datetime", nullable: true })
  last_refreshed_at: Date | null;
}