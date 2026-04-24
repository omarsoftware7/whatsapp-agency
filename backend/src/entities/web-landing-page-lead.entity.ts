import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { WebLandingPage } from './web-landing-page.entity';
import { Client } from './client.entity';

@Entity('web_landing_page_leads')
export class WebLandingPageLead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  landing_page_id: number;

  @Column()
  client_id: number;

  @ManyToOne(() => WebLandingPage, (lp) => lp.leads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'landing_page_id' })
  landingPage: WebLandingPage;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  source_url: string;

  @CreateDateColumn()
  created_at: Date;
}
