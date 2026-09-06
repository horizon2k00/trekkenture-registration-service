import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { SaveFormDto } from '../dto/event.dto';
import { EventStatus } from '../entities/event.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubmissionsService } from '../submissions/submissions.service';
import { EventsService } from './events.service';
import { ReportingService } from './reporting.service';

@UseGuards(JwtAuthGuard)
@Controller('admin/forms')
export class AdminFormsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly submissionsService: SubmissionsService,
    private readonly reportingService: ReportingService,
  ) {}

  @Get()
  findAll(@Query('status') status?: EventStatus) {
    return this.eventsService.findAll(status);
  }

  @Post()
  create(@Body() dto: SaveFormDto) {
    return this.eventsService.create(dto);
  }

  @Get(':id/submissions/export')
  export(@Param('id', ParseUUIDPipe) id: string): Promise<StreamableFile> {
    return this.reportingService.exportEventSubmissions(id);
  }

  @Get(':id/submissions')
  submissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.submissionsService.findByEvent(id);
  }

  @Post(':id/publish')
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.publish(id);
  }

  @Post(':id/close')
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.close(id);
  }

  @Post(':id/reopen')
  reopen(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.reopen(id);
  }

  @Get('payment-settings')
  paymentSettings() {
    return this.eventsService.getPaymentSettings();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SaveFormDto) {
    return this.eventsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteDraft(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.deleteDraft(id);
  }
}

@Controller('forms')
export class PublicFormsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.eventsService.getPublicForm(slug);
  }
}
