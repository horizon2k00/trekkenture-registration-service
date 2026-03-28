import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { Event } from '../entities/event.entity';
import { ReportingService } from './reporting.service';
import { Submission } from '../entities/submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Submission])],
  controllers: [EventsController],
  providers: [EventsService, ReportingService],
  exports: [EventsService],
})
export class EventsModule {}
