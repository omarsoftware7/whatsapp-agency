import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { WebLandingPage } from './web-landing-page.entity';
import { Client } from './client.entity';

@Entity('web_landing_page_edits')
export class WebLandingPageEdit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  landing_page_id: number;

  @Column()
  client_id: number;

  @ManyToOne(() => WebLandingPage, (lp) => lp.edits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'landing_page_id' })
  landingPage: WebLandingPage;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ type: 'text' })
  user_prompt: string;

  @Column({ default: 'pending' })
  status: string; // pending | completed | failed

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;
}
