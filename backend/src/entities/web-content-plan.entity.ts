import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Client } from './client.entity';
import { WebUser } from './web-user.entity';
import { WebContentPlanItem } from './web-content-plan-item.entity';

@Entity('web_content_plans')
export class WebContentPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  client_id: number;

  @Column()
  web_user_id: number;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => WebUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'web_user_id' })
  webUser: WebUser;

  @Column()
  mode: string; // auto | manual

  @Column({ type: 'text', nullable: true })
  user_prompt: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => WebContentPlanItem, (i) => i.plan)
  items: WebContentPlanItem[];
}
