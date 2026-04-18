import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { WebUser } from './web-user.entity';

@Entity('web_referrals')
@Unique(['referred_user_id'])
export class WebReferral {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  referrer_user_id: number;

  @Column({ unique: true })
  referred_user_id: number;

  @Column({ length: 32 })
  code: string;

  @Column({ default: 'pending', length: 16 })
  status: string; // pending | rewarded

  @Column({ default: false })
  discount_applied: boolean;

  @Column({ type: 'timestamp', nullable: true })
  rewarded_at: Date;

  @ManyToOne(() => WebUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrer_user_id' })
  referrer: WebUser;

  @ManyToOne(() => WebUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referred_user_id' })
  referred: WebUser;

  @CreateDateColumn()
  created_at: Date;
}
