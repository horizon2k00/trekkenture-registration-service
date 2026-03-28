import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto } from '../dto/event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportingService } from './reporting.service';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly reportingService: ReportingService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new event',
    description:
      'Creates a new trekking/adventure event with form configuration and payment details',
  })
  @ApiBody({ type: CreateEventDto })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  create(@Body(ValidationPipe) createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all events',
    description: 'Retrieves a list of all available events',
  })
  @ApiResponse({
    status: 200,
    description: 'List of events retrieved successfully',
  })
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get event by slug',
    description: 'Retrieves a specific event by its URL-friendly slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'URL-friendly event identifier (e.g., "summer-trek-2026")',
    example: 'summer-trek-2026',
  })
  @ApiResponse({
    status: 200,
    description: 'Event found and returned successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  findBySlug(@Param('slug') slug: string) {
    return this.eventsService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update an event',
    description: 'Updates an existing event with partial data',
  })
  @ApiParam({
    name: 'id',
    description: 'Event UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateEventDto })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an event',
    description: 'Permanently deletes an event and all associated submissions',
  })
  @ApiParam({
    name: 'id',
    description: 'Event UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Event deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Get(':id/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Export event submissions',
    description: 'Exports all submissions for an event as an Excel spreadsheet',
  })
  @ApiParam({
    name: 'id',
    description: 'Event UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Excel file containing all submissions',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  async exportSubmissions(@Param('id') id: string): Promise<StreamableFile> {
    return this.reportingService.exportEventSubmissions(id);
  }
}
