export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
export interface SessionUser {
    id: number;
    email: string;
    role: string;
    maxBrands: number;
    planTier: string;
    subscriptionStatus: string;
    textCredits: number;
    imageCredits: number;
    videoCredits: number;
    landingCredits: number;
}
