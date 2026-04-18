import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin/users')
@UseGuards(SessionGuard, AdminGuard)
export class AdminUsersController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list() { return this.admin.listUsers(); }

  @Post()
  create(@Body() body: any) { return this.admin.createUser(body); }

  @Post(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.admin.updateUser(id, body); }
}
