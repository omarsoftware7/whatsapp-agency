import { Controller, Get, Post, Body, Query, ParseIntPipe, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionGuard } from '../../common/guards/session.guard';
import { CurrentUser, SessionUser } from '../../common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { parse } from 'csv-parse/sync';

@Controller('leads')
@UseGuards(SessionGuard)
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Get()
  list(@Query('client_id', ParseIntPipe) clientId: number) {
    return this.service.listForClient(clientId);
  }

  @Get('manual')
  listManual(@Query('client_id', ParseIntPipe) clientId: number, @CurrentUser() user: SessionUser) {
    return this.service.listManualForClient(clientId, user.id);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { client_id: string },
    @CurrentUser() user: SessionUser,
  ) {
    const records = parse(file.buffer, { columns: true, skip_empty_lines: true });
    return this.service.importCsv(parseInt(body.client_id), user.id, records);
  }
}
