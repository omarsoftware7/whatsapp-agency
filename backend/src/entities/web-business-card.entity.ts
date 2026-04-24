import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToOne, JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';

@Entity('web_business_cards')
export class WebBusinessCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  client_id: number;

  @OneToOne(() => Client, (c) => c.businessCard)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  subtitle: string;

  @Column({ nullable: true, length: 500 })
  header_image_url: string;

  @Column({ nullable: true })
  phone_1: string;

  @Column({ nullable: true })
  phone_2: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  location_url: string;

  @Column({ nullable: true })
  facebook_url: string;

  @Column({ nullable: true })
  instagram_url: string;

  @Column({ nullable: true })
  whatsapp_number: string;

  @Column({ type: 'jsonb', nullable: true })
  gallery_images: string[]; // max 10

  @Column({ default: 'draft' })
  status: string; // draft | generating | published | failed

  @Column({ nullable: true, unique: true, length: 255 })
  public_slug: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
