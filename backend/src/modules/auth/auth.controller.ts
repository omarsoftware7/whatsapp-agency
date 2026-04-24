import { Controller, Post, Body, Req, Res, HttpCode, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionGuard } from '../../common/guards/session.guard';
import { CurrentUser, SessionUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    const user = await this.authService.register(
      dto,
      dto.referral_code,
      dto.heard_about,
    );
    const sessionData = this.authService.buildSessionData(user);
    Object.assign(req.session, sessionData);
    return { success: true, user: sessionData };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const user = await this.authService.login(dto.email, dto.password);
    req.session.regenerate((err: any) => { if (err) throw err; });
    const sessionData = this.authService.buildSessionData(user);
    Object.assign(req.session, sessionData);
    return { success: true, user: sessionData };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: any) {
    req.session.destroy();
    return { success: true };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@CurrentUser() user: SessionUser, @Req() req: any) {
    const fullUser = await this.authService.findById(user.id);
    const referralCode = await this.authService.getReferralCode(user.id);
    if (!fullUser) throw new Error('User not found');
    return { success: true, user: { ...this.authService.buildSessionData(fullUser), referral_code: referralCode } };
  }

  @Post('apply-referral')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  async applyReferral(@Body() body: { referral_code: string }, @CurrentUser() user: SessionUser) {
    await this.authService.applyReferral(user.id, body.referral_code);
    return { success: true };
  }
}
