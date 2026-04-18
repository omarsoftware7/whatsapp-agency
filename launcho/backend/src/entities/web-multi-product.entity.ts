import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { CreativeJob } from './creative-job.entity';

@Entity('web_multi_products')
export class WebMultiProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  job_id: number;

  @ManyToOne(() => CreativeJob, (j) => j.multiProducts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: CreativeJob;

  @Column({ default: 0 })
  sort_order: number;

  @Column({ nullable: true, length: 500 })
  product_image_url: string;

  @Column({ nullable: true, length: 255 })
  product_name: string;

  @Column({ nullable: true, length: 50 })
  price: string;

  @Column({ nullable: true, length: 50 })
  old_price: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true, length: 500 })
  generated_image_url: string;

  @Column({ default: 'pending' })
  status: string; // pending | generating | completed | failed

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
