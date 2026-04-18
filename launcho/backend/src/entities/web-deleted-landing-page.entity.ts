import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { WebUser } from './web-user.entity';
import { WebLandingPage } from './web-landing-page.entity';

@Entity('web_deleted_landing_pages')
@Unique(['web_user_id', 'landing_page_id'])
export class WebDeletedLandingPage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  landing_page_id: number;

  @Column()
  web_user_id: number;

  @ManyToOne(() => WebLandingPage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'landing_page_id' })
  landingPage: WebLandingPage;

  @ManyToOne(() => WebUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'web_user_id' })
  webUser: WebUser;

  @CreateDateColumn()
  deleted_at: Date;
}
