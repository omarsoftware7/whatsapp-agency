import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Client } from './client.entity';
import { WebLandingPageLead } from './web-landing-page-lead.entity';
import { WebLandingPageEdit } from './web-landing-page-edit.entity';

@Entity('web_landing_pages')
export class WebLandingPage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  client_id: number;

  @ManyToOne(() => Client, (c) => c.landingPages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ nullable: true, length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  user_prompt: string;

  @Column({ type: 'jsonb', nullable: true })
  user_images: string[];

  @Column({ type: 'text', nullable: true })
  html: string;

  @Column({ default: 'draft' })
  status: string; // draft | generating | published | archived | failed

  @Column({ nullable: true, unique: true, length: 255 })
  public_slug: string;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => WebLandingPageLead, (l) => l.landingPage)
  leads: WebLandingPageLead[];

  @OneToMany(() => WebLandingPageEdit, (e) => e.landingPage)
  edits: WebLandingPageEdit[];
}
