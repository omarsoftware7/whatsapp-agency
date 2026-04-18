import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  interest: string;

  @Column({ nullable: true })
  business_type: string; // business | agency

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ad_spend: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  agency_payment: number;

  @Column({ default: 'new' })
  status: string; // new | contacted | qualified | converted | rejected

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
