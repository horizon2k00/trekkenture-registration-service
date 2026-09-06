import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import {
  AdminFormsController,
  PublicFormsController,
} from './events.controller';
import { Event } from '../entities/event.entity';
import { ReportingService } from './reporting.service';
import { Submission } from '../entities/submission.entity';
import { SubmissionsModule } from '../submissions/submissions.module';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Submission]),
    SubmissionsModule,
    QuestionsModule,
  ],
  controllers: [AdminFormsController, PublicFormsController],
  providers: [EventsService, ReportingService],
  exports: [EventsService],
})
export class EventsModule {}
