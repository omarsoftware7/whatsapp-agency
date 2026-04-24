import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Client } from './client.entity';
import { WebMultiProduct } from './web-multi-product.entity';
import { WebDesignEditRequest } from './web-design-edit-request.entity';

export type JobType =
  | 'announcement' | 'product_sale' | 'from_image' | 'before_after'
  | 'reel' | 'content_strategy' | 'ugc_video' | 'multi_mode' | 'video' | 'tips_carousel';

export type JobStage =
  | 'await_user_input' | 'pending' | 'generate_design' | 'generate_video'
  | 'await_design_approval' | 'generate_ad_copy' | 'await_copy_approval'
  | 'await_publish_approval' | 'publishing' | 'generate_multi_variants'
  | 'multi_collect' | 'completed' | 'rejected';

@Entity('creative_jobs')
export class CreativeJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  client_id: number;

  @ManyToOne(() => Client, (c) => c.jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column()
  job_type: JobType;

  @Column({ type: 'text', nullable: true })
  user_message: string;

  @Column({ type: 'jsonb', nullable: true })
  user_images: string[];

  @Column({ type: 'text', nullable: true })
  product_images: string; // JSON string of URLs

  @Column({ nullable: true })
  detected_language: string;

  @Column({ nullable: true })
  creative_type: string;

  @Column({ type: 'jsonb', nullable: true })
  extracted_data: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  design_prompt: string;

  @Column({ default: 'post' })
  image_size: string; // post | story

  @Column({ default: 'en' })
  language: string; // en | ar | he

  @Column({ default: 'image', length: 20 })
  media_type: string; // image | video

  @Column({ type: 'jsonb', nullable: true })
  design_variations: string[]; // array of image/video URLs

  @Column({ default: false })
  design_approved: boolean;

  @Column({ type: 'timestamp', nullable: true })
  design_approved_at: Date;

  @Column({ type: 'int', nullable: true })
  approved_design_index: number;

  @Column({ type: 'text', nullable: true })
  ad_copy: string; // JSON: {headline, body, cta}

  @Column({ default: false })
  ad_copy_approved: boolean;

  @Column({ type: 'timestamp', nullable: true })
  ad_copy_approved_at: Date;

  @Column({ default: false })
  publish_approved: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publish_approved_at: Date;

  @Column({ nullable: true })
  facebook_post_id: string;

  @Column({ nullable: true })
  instagram_post_id: string;

  @Column({ nullable: true })
  instagram_permalink: string;

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  multi_products: any[];

  @Column({ default: false })
  is_bulk_sale: boolean;

  @Column({ type: 'jsonb', nullable: true })
  bulk_products: any[];

  @Column({ default: false })
  template_approved: boolean;

  @Column({ type: 'text', nullable: true })
  reel_video_url: string;

  @Column({ type: 'int', nullable: true })
  reel_duration_seconds: number;

  @Column({ default: 'pending' })
  current_stage: JobStage;

  @Column({ default: 0 })
  rejection_count: number;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ default: 1 })
  credits_cost: number;

  @Column({ default: false })
  credits_charged: boolean;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'int', nullable: true })
  processing_time_ms: number;

  @Column({ default: 0 })
  product_images_count: number;

  @Column({ default: false })
  processing_lock: boolean;

  @Column({ type: 'timestamp', nullable: true })
  processing_lock_at: Date;

  @OneToMany(() => WebMultiProduct, (p) => p.job)
  multiProducts: WebMultiProduct[];

  @OneToMany(() => WebDesignEditRequest, (e) => e.job)
  editRequests: WebDesignEditRequest[];
}
