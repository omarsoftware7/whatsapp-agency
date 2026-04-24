import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { WebUser } from './web-user.entity';

@Entity('web_payments')
export class WebPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  web_user_id: number;

  @ManyToOne(() => WebUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'web_user_id' })
  webUser: WebUser;

  @Column()
  provider: string; // paypal | sumit

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'ILS', length: 10 })
  currency: string;

  @Column({ default: 'pending' })
  status: string; // success | failed | pending

  @Column({ nullable: true, length: 100 })
  reference: string;

  @CreateDateColumn()
  created_at: Date;
}
