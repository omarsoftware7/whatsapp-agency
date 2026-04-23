import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AuthService } from './auth.service';
import { randomBytes } from 'crypto';

@Controller('auth/google')
export class GoogleOAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('start')
  start(@Req() req: any, @Res() res: any) {
    const state = randomBytes(16).toString('hex');
    req.session.oauth_state = state;

    const params = new URLSearchParams({
      client_id: this.config.get<string>('GOOGLE_CLIENT_ID', ''),
      redirect_uri: this.config.get<string>('GOOGLE_CALLBACK_URL', ''),
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  @Get('callback')
  async callback(@Query() query: any, @Req() req: any, @Res() res: any) {
    const { code, state } = query;
    if (!code || state !== req.session.oauth_state) {
      return res.redirect('/login?error=oauth_failed');
    }

    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: this.config.get('GOOGLE_CLIENT_ID'),
      client_secret: this.config.get('GOOGLE_CLIENT_SECRET'),
      redirect_uri: this.config.get('GOOGLE_CALLBACK_URL'),
      grant_type: 'authorization_code',
    });

    const infoRes = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${tokenRes.data.id_token}`,
    );
    const profile = infoRes.data;

    const user = await this.authService.findOrCreateGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      firstName: profile.given_name,
      lastName: profile.family_name,
      avatar: profile.picture,
    });

    req.session.regenerate((err: any) => {
      if (err) return res.redirect('/login?error=session_error');
      Object.assign(req.session, this.authService.buildSessionData(user));
      res.redirect('/app');
    });
  }
}
