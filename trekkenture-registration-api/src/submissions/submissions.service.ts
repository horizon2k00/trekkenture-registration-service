import {
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateSubmissionDto } from '../dto/submission.dto';
import { Event, EventStatus } from '../entities/event.entity';
import { Submission } from '../entities/submission.entity';
import { validateAnswers } from './validate-answers';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionsRepository: Repository<Submission>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    private readonly dataSource: DataSource,
  ) {}

  async createBySlug(
    slug: string,
    dto: CreateSubmissionDto,
  ): Promise<{ submission: Submission; event: Event }> {
    const result = await this.dataSource.transaction(async (manager) => {
      // Lock the form row so closing a form and accepting a response cannot race.
      const event = await manager
        .getRepository(Event)
        .createQueryBuilder('event')
        .setLock('pessimistic_write')
        .where('event.slug = :slug', { slug })
        .getOne();
      if (!event) throw new NotFoundException('Registration form not found');
      if (event.status !== EventStatus.PUBLISHED) {
        throw new GoneException('This form is not accepting responses');
      }
      const answers = validateAnswers(event.questions, dto.answers);
      const submission = await manager.getRepository(Submission).save(
        manager.getRepository(Submission).create({
          eventId: event.id,
          answers,
        }),
      );
      return { submission, event };
    });
    this.logger.log(
      `Stored submission ${result.submission.id} for form ${result.event.id}`,
    );
    return result;
  }

  async findByEvent(eventId: string): Promise<Submission[]> {
    const exists = await this.eventsRepository.exist({
      where: { id: eventId },
    });
    if (!exists)
      throw new NotFoundException(`Form with ID '${eventId}' not found`);
    return this.submissionsRepository.find({
      where: { eventId },
      order: { submittedAt: 'DESC' },
    });
  }
}
