import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, OneToOne,
} from 'typeorm';
import { CreativeJob } from './creative-job.entity';
import { WebUserClient } from './web-user-client.entity';
import { WebBrandProfile } from './web-brand-profile.entity';
import { WebLandingPage } from './web-landing-page.entity';
import { WebBusinessCard } from './web-business-card.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  phone_number: string;

  @Column({ nullable: true })
  whatsapp_name: string;

  @Column({ nullable: true })
  business_name: string;

  @Column({ type: 'text', nullable: true })
  business_description: string;

  @Column({ nullable: true, length: 255 })
  logo_filename: string;

  @Column({ nullable: true, length: 7 })
  primary_color: string;

  @Column({ nullable: true, length: 7 })
  secondary_color: string;

  @Column({ nullable: true, length: 50 })
  font_preference: string;

  @Column({ nullable: true, length: 20 })
  brand_tone: string; // professional | playful | luxury | minimal | vibrant

  @Column({ nullable: true, length: 5, default: 'en' })
  default_language: string; // en | ar | he

  @Column({ nullable: true, length: 100 })
  industry: string;

  @Column({ nullable: true, length: 50 })
  business_phone: string;

  @Column({ type: 'text', nullable: true })
  business_address: string;

  @Column({ default: 'trial' })
  subscription_status: string; // trial | active | suspended | cancelled

  @Column({ default: 5 })
  trial_credits: number;

  @Column({ default: 0 })
  monthly_credits: number;

  @Column({ default: 0 })
  content_posts_this_week: number;

  @Column({ type: 'date', nullable: true })
  content_week_reset_date: Date;

  @Column({ default: false })
  onboarding_complete: boolean;

  @Column({ default: 'upload_logo', length: 50 })
  onboarding_step: string;

  @Column({ type: 'text', nullable: true })
  meta_page_id: string;

  @Column({ type: 'text', nullable: true })
  meta_page_token: string;

  @Column({ type: 'timestamp', nullable: true })
  meta_page_token_expires: Date;

  @Column({ type: 'text', nullable: true })
  instagram_account_id: string;

  @Column({ default: false })
  meta_tokens_valid: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_activity_at: Date;

  // Virtual: logo_url computed from logo_filename
  get logo_url(): string | null {
    return this.logo_filename ? `/uploads/logos/${this.logo_filename}` : null;
  }

  @OneToMany(() => CreativeJob, (job) => job.client)
  jobs: CreativeJob[];

  @OneToMany(() => WebUserClient, (wuc) => wuc.client)
  userLinks: WebUserClient[];

  @OneToOne(() => WebBrandProfile, (bp) => bp.client)
  brandProfile: WebBrandProfile;

  @OneToMany(() => WebLandingPage, (lp) => lp.client)
  landingPages: WebLandingPage[];

  @OneToOne(() => WebBusinessCard, (bc) => bc.client)
  businessCard: WebBusinessCard;
}
