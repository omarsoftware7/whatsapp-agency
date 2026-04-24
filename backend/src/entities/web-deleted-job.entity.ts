import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { WebUser } from './web-user.entity';
import { CreativeJob } from './creative-job.entity';
import { Client } from './client.entity';

@Entity('web_deleted_jobs')
@Unique(['web_user_id', 'job_id'])
export class WebDeletedJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  job_id: number;

  @Column()
  web_user_id: number;

  @Column()
  client_id: number;

  @ManyToOne(() => CreativeJob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: CreativeJob;

  @ManyToOne(() => WebUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'web_user_id' })
  webUser: WebUser;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @CreateDateColumn()
  deleted_at: Date;
}
