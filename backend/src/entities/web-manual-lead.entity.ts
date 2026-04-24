import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { WebUser } from './web-user.entity';
import { Client } from './client.entity';

@Entity('web_manual_leads')
export class WebManualLead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  web_user_id: number;

  @Column()
  client_id: number;

  @ManyToOne(() => WebUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'web_user_id' })
  webUser: WebUser;

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
  source: string;

  @CreateDateColumn()
  imported_at: Date;
}
