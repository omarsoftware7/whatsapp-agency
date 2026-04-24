import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { CurrentUser, SessionUser } from '../../common/decorators/current-user.decorator';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(SessionGuard)
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Post('update')
  update(@Body() body: { first_name?: string; last_name?: string; theme_mode?: string }, @CurrentUser() user: SessionUser) {
    return this.service.updateProfile(user.id, body);
  }

  @Post('change-password')
  changePassword(@Body() body: { current_password: string; new_password: string }, @CurrentUser() user: SessionUser) {
    return this.service.changePassword(user.id, body.current_password, body.new_password);
  }

  @Get('stats')
  stats(@CurrentUser() user: SessionUser) {
    return this.service.getStats(user.id);
  }

  @Get('limits')
  limits(@CurrentUser() user: SessionUser) {
    return this.service.getLimits(user.id);
  }

  @Post('delete-account')
  deleteAccount(@CurrentUser() user: SessionUser) {
    return this.service.deleteAccount(user.id);
  }
}
