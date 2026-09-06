import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { Answer } from '../questions/question-types';

@Entity('submissions')
@Index(['eventId', 'submittedAt'])
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, (event) => event.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'jsonb' })
  // Retain old array answers for reading/exporting; new answers are scalar only.
  answers: Record<string, Answer | string[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  submittedAt: Date;
}
