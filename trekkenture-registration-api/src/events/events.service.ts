import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SaveFormDto } from '../dto/event.dto';
import { Event, EventStatus } from '../entities/event.entity';
import { QuestionsService } from '../questions/questions.service';
import { PAYMENT_GROUP_ID } from '../questions/question-types';
import { buildFormDefinition, validateForPublishing } from './form-definition';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event) private readonly events: Repository<Event>,
    private readonly questions: QuestionsService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: SaveFormDto): Promise<Event> {
    const definition = buildFormDefinition(
      dto,
      await this.questions.getCatalog(),
    );
    return this.save(
      this.events.create({
        ...definition,
        status: EventStatus.DRAFT,
        publishedAt: null,
        closedAt: null,
      }),
    );
  }

  async findAll(status?: EventStatus): Promise<Event[]> {
    if (status && !Object.values(EventStatus).includes(status)) {
      throw new BadRequestException('Invalid form status');
    }
    const query = this.events
      .createQueryBuilder('event')
      .loadRelationCountAndMap('event.responseCount', 'event.submissions')
      .orderBy('event.createdAt', 'DESC');
    if (status) query.where('event.status = :status', { status });
    return query.getMany();
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.events.findOneBy({ id });
    if (!event) throw new NotFoundException('Form not found');
    return event;
  }

  getPaymentSettings() {
    return {
      upiId: this.config.get<string>('UPI_ID', ''),
      payeeName: this.config.get<string>('UPI_PAYEE_NAME', 'Trekkenture'),
      currency: this.config.get<string>('UPI_CURRENCY', 'INR'),
    };
  }

  async getPublicForm(slug: string) {
    const event = await this.events.findOneBy({
      slug,
      status: In([EventStatus.PUBLISHED, EventStatus.CLOSED]),
    });
    if (!event) throw new NotFoundException('Registration form not found');
    const summary = {
      id: event.id,
      name: event.name,
      slug: event.slug,
      status: event.status,
    };
    if (event.status === EventStatus.CLOSED) return summary;

    return {
      ...summary,
      questions: event.questions,
      groups: event.groups,
      payment: !event.questions.some(
        (question) => question.groupId === PAYMENT_GROUP_ID,
      )
        ? undefined
        : {
            advancePayment: event.advancePayment,
            totalPayment: event.totalPayment,
            ...this.getPaymentSettings(),
          },
    };
  }

  async update(id: string, dto: SaveFormDto): Promise<Event> {
    return this.events.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Event);
      const event = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!event) throw new NotFoundException('Form not found');
      if (event.status !== EventStatus.DRAFT) {
        throw new ConflictException('Only drafts can be edited');
      }
      const definition = buildFormDefinition(
        dto,
        await this.questions.getCatalog(),
        event,
      );
      return this.save(Object.assign(event, definition), repository);
    });
  }

  async deleteDraft(id: string): Promise<void> {
    // Serialize deletion with draft saves and publishing.
    await this.events.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Event);
      const event = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!event) throw new NotFoundException('Form not found');
      if (event.status !== EventStatus.DRAFT) {
        throw new ConflictException('Only drafts can be deleted');
      }
      await repository.delete(id);
    });
  }

  publish(id: string) {
    return this.changeStatus(id, EventStatus.DRAFT, EventStatus.PUBLISHED);
  }

  close(id: string) {
    return this.changeStatus(id, EventStatus.PUBLISHED, EventStatus.CLOSED);
  }

  reopen(id: string) {
    return this.changeStatus(id, EventStatus.CLOSED, EventStatus.PUBLISHED);
  }

  private async changeStatus(id: string, from: EventStatus, to: EventStatus) {
    // Use the same row lock as submissions and draft saves.
    return this.events.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Event);
      const event = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!event) throw new NotFoundException('Form not found');
      if (event.status !== from) {
        throw new ConflictException(
          `Cannot change a ${event.status} form to ${to}`,
        );
      }
      if (to === EventStatus.PUBLISHED) validateForPublishing(event);
      if (
        to === EventStatus.PUBLISHED &&
        event.advancePayment !== null &&
        !this.config.get<string>('UPI_ID')?.trim()
      ) {
        throw new BadRequestException(
          'Configure UPI_ID before publishing payment instructions',
        );
      }
      event.status = to;
      if (from === EventStatus.DRAFT) event.publishedAt = new Date();
      event.closedAt = to === EventStatus.CLOSED ? new Date() : null;
      const saved = await repository.save(event);
      this.logger.log(`Form ${id}: ${from} -> ${to}`);
      return saved;
    });
  }

  private async save(event: Event, repository = this.events) {
    try {
      return await repository.save(event);
    } catch (error) {
      if (error.code === '23505')
        throw new ConflictException('This public URL slug is already in use');
      throw error;
    }
  }
}
