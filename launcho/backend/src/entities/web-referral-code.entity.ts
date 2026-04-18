import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  OneToOne, JoinColumn,
} from 'typeorm';
import { WebUser } from './web-user.entity';

@Entity('web_referral_codes')
export class WebReferralCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  user_id: number;

  @OneToOne(() => WebUser)
  @JoinColumn({ name: 'user_id' })
  user: WebUser;

  @Column({ unique: true, length: 32 })
  code: string; // 8-char hex

  @CreateDateColumn()
  created_at: Date;
}
