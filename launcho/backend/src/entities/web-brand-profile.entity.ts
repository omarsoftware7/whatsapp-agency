import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToOne, JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';

@Entity('web_brand_profiles')
export class WebBrandProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  client_id: number;

  @OneToOne(() => Client, (c) => c.brandProfile)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  instagram_handle: string;

  @Column({ nullable: true })
  meta_page_id: string;

  @Column({ type: 'text', nullable: true })
  meta_page_token: string;

  @Column({ type: 'timestamp', nullable: true })
  meta_page_token_expires: Date;

  @Column({ nullable: true })
  instagram_account_id: string;

  @Column({ default: false })
  meta_tokens_valid: boolean;

  @Column({ type: 'text', nullable: true })
  target_audience: string;

  @Column({ nullable: true })
  price_range: string; // low | med | high | unknown

  @Column({ default: 'Israel' })
  country: string;

  @Column({ nullable: true })
  facebook_page_url: string;

  @Column({ nullable: true })
  instagram_page_url: string;

  @Column({ nullable: true })
  heard_about: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
