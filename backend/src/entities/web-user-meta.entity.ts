import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
  OneToOne, JoinColumn,
} from 'typeorm';
import { WebUser } from './web-user.entity';

@Entity('web_user_meta')
export class WebUserMeta {
  @PrimaryColumn()
  user_id: number;

  @OneToOne(() => WebUser)
  @JoinColumn({ name: 'user_id' })
  user: WebUser;

  @Column({ nullable: true, length: 64 })
  heard_about: string;

  @Column({ nullable: true, length: 32 })
  referral_code_used: string;

  @CreateDateColumn()
  created_at: Date;
}
