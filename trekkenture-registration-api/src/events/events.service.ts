import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { CreateEventDto, UpdateEventDto } from '../dto/event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    // Check if slug already exists
    const existingEvent = await this.eventsRepository.findOne({
      where: { slug: createEventDto.slug },
    });

    if (existingEvent) {
      throw new ConflictException(
        `Event with slug '${createEventDto.slug}' already exists`,
      );
    }

    const event = new Event();
    Object.assign(event, createEventDto);
    return await this.eventsRepository.save(event);
  }

  async findAll(): Promise<Event[]> {
    return this.eventsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException(`Event with ID '${id}' not found`);
    }

    return event;
  }

  async findBySlug(slug: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { slug } });

    if (!event) {
      throw new NotFoundException(`Event with slug '${slug}' not found`);
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);

    // Check if slug is being changed and if it already exists
    if (updateEventDto.slug && updateEventDto.slug !== event.slug) {
      const existingEvent = await this.eventsRepository.findOne({
        where: { slug: updateEventDto.slug },
      });

      if (existingEvent) {
        throw new ConflictException(
          `Event with slug '${updateEventDto.slug}' already exists`,
        );
      }
    }

    Object.assign(event, updateEventDto);
    return this.eventsRepository.save(event);
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
    await this.eventsRepository.remove(event);
  }
}
