import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToOne, JoinColumn,
} from 'typeorm';
import { CreativeJob } from './creative-job.entity';
import { Client } from './client.entity';

@Entity('web_scheduled_posts')
export class WebScheduledPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  job_id: number;

  @Column()
  client_id: number;

  @OneToOne(() => CreativeJob)
  @JoinColumn({ name: 'job_id' })
  job: CreativeJob;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ type: 'timestamp' })
  scheduled_at: Date;

  @Column({ length: 10 })
  publish_type: string; // post | story

  @Column({ default: 'pending' })
  status: string; // pending | published | failed | cancelled

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date;
}
