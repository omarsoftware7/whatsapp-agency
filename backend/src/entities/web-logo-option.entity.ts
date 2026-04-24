import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';

@Entity('web_logo_options')
export class WebLogoOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  client_id: number;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ nullable: true })
  batch_id: number;

  @Column({ nullable: true, length: 500 })
  image_url: string;

  @Column({ type: 'text', nullable: true })
  prompt: string;

  @Column({ default: 'option' })
  status: string; // option | approved | superseded

  @CreateDateColumn()
  created_at: Date;
}
