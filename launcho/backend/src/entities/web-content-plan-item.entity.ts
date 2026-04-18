import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { WebContentPlan } from './web-content-plan.entity';
import { Client } from './client.entity';
import { CreativeJob } from './creative-job.entity';

@Entity('web_content_plan_items')
export class WebContentPlanItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  plan_id: number;

  @Column()
  client_id: number;

  @ManyToOne(() => WebContentPlan, (p) => p.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: WebContentPlan;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ nullable: true, length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  idea_text: string;

  @Column({ nullable: true })
  job_type: string; // announcement | product_sale | from_image | before_after

  @Column({ default: 'draft' })
  status: string; // draft | approved | created | superseded

  @Column({ nullable: true })
  job_id: number;

  @ManyToOne(() => CreativeJob, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'job_id' })
  job: CreativeJob;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
