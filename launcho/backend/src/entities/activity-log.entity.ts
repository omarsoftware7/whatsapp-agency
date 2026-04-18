import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { CreativeJob } from './creative-job.entity';

@Entity('activity_log')
export class ActivityLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ nullable: true })
  client_id: number;

  @Column({ nullable: true })
  job_id: number;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => CreativeJob, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'job_id' })
  job: CreativeJob;

  @Column({ length: 50 })
  event_type: string;

  @Column({ type: 'jsonb', nullable: true })
  event_data: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;
}
