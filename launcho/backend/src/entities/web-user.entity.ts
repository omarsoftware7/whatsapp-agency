import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, BeforeInsert, BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { WebUserClient } from './web-user-client.entity';

export type PlanTier = 'trial' | 'starter' | 'growth' | 'pro' | 'agency' | 'expired';
export type SubscriptionStatus = 'trial' | 'active' | 'canceled' | 'expired' | 'past_due';

@Entity('web_users')
export class WebUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ nullable: true, length: 255 })
  password_hash: string;

  @Column({ nullable: true, length: 255 })
  google_id: string;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ nullable: true, length: 500 })
  avatar_url: string;

  @Column({ default: 'default' })
  theme_mode: string; // brand | default

  @Column({ nullable: true })
  account_type: string; // agency | freelancer | business

  @Column({ default: 'trial' })
  plan_tier: PlanTier;

  @Column({ default: 'trial' })
  subscription_status: SubscriptionStatus;

  @Column({ type: 'timestamp', nullable: true })
  trial_end_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  plan_end_at: Date;

  @Column({ nullable: true })
  plan_interval: string; // monthly | yearly

  @Column({ default: 10 })
  credits_remaining: number;

  @Column({ default: 0 })
  text_credits_remaining: number;

  @Column({ default: 0 })
  image_credits_remaining: number;

  @Column({ default: 0 })
  video_credits_remaining: number;

  @Column({ default: 0 })
  landing_credits_remaining: number;

  @Column({ type: 'timestamp', nullable: true })
  credits_reset_at: Date;

  @Column({ nullable: true, length: 100 })
  paypal_subscription_id: string;

  @Column({ nullable: true })
  payment_provider: string; // paypal | sumit

  @Column({ nullable: true })
  sumit_customer_id: string;

  @Column({ nullable: true })
  sumit_recurring_id: string;

  @Column({ nullable: true })
  payment_last4: string;

  @Column({ type: 'timestamp', nullable: true })
  subscription_started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_login_at: Date;

  @Column({ default: 'user' })
  role: string; // admin | user

  @Column({ default: 1 })
  max_brands: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => WebUserClient, (wuc) => wuc.webUser)
  brandLinks: WebUserClient[];

  async setPassword(plain: string) {
    this.password_hash = await bcrypt.hash(plain, 12);
  }

  async validatePassword(plain: string): Promise<boolean> {
    if (!this.password_hash) return false;
    return bcrypt.compare(plain, this.password_hash);
  }
}
