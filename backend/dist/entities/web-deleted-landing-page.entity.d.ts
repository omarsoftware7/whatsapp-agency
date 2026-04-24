import { WebUser } from './web-user.entity';
import { WebLandingPage } from './web-landing-page.entity';
export declare class WebDeletedLandingPage {
    id: number;
    landing_page_id: number;
    web_user_id: number;
    landingPage: WebLandingPage;
    webUser: WebUser;
    deleted_at: Date;
}
