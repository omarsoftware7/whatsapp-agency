import { Controller, Get, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { LibraryService } from './library.service';

@Controller('library')
@UseGuards(SessionGuard)
export class LibraryController {
  constructor(private readonly service: LibraryService) {}

  @Get()
  getLibrary(@Query('client_id', ParseIntPipe) clientId: number) {
    return this.service.getLibrary(clientId);
  }
}
