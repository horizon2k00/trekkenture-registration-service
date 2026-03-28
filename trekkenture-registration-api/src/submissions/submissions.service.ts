import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../entities/submission.entity';
import { Event } from '../entities/event.entity';
import { CreateSubmissionDto } from '../dto/submission.dto';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createSubmissionDto: CreateSubmissionDto): Promise<Submission> {
    // Verify event exists
    const event = await this.eventsRepository.findOne({
      where: { id: createSubmissionDto.eventId },
    });

    if (!event) {
      throw new NotFoundException(
        `Event with ID '${createSubmissionDto.eventId}' not found`,
      );
    }

    const submission = this.submissionsRepository.create({
      eventId: createSubmissionDto.eventId,
      formData: createSubmissionDto.formData,
    });

    return this.submissionsRepository.save(submission);
  }

  async findAll(): Promise<Submission[]> {
    return this.submissionsRepository.find({
      relations: ['event'],
      order: { submittedAt: 'DESC' },
    });
  }

  async findByEvent(eventId: string): Promise<Submission[]> {
    return this.submissionsRepository.find({
      where: { eventId },
      order: { submittedAt: 'DESC' },
    });
  }
}
