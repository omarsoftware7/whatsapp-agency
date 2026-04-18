import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { WebUser } from './web-user.entity';
import { Client } from './client.entity';

@Entity('web_user_clients')
@Unique(['web_user_id', 'client_id'])
export class WebUserClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  web_user_id: number;

  @Column()
  client_id: number;

  @ManyToOne(() => WebUser, (u) => u.brandLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'web_user_id' })
  webUser: WebUser;

  @ManyToOne(() => Client, (c) => c.userLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @CreateDateColumn()
  created_at: Date;
}
