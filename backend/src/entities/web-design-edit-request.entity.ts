import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { CreativeJob } from './creative-job.entity';
import { Client } from './client.entity';

@Entity('web_design_edit_requests')
export class WebDesignEditRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  job_id: number;

  @Column()
  client_id: number;

  @ManyToOne(() => CreativeJob, (j) => j.editRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: CreativeJob;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ type: 'text' })
  user_edit: string;

  @Column({ default: 'pending' })
  status: string; // pending | completed | failed | superseded

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ nullable: true, length: 500 })
  result_image_url: string;

  @CreateDateColumn()
  requested_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;
}
