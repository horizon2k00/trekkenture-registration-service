import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import {
  AnswerType,
  FieldType,
  QuestionDefinition,
} from '../questions/question-types';
import { QuestionGroup } from './question-group.entity';

@Entity('questions')
export class Question implements QuestionDefinition {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  groupId: string;

  @ManyToOne(() => QuestionGroup, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'groupId' })
  group: QuestionGroup;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'varchar' })
  fieldType: FieldType;

  @Column({ type: 'varchar', nullable: true })
  answerType: AnswerType | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  options: string[];

  @Column({ type: 'varchar', nullable: true })
  min: string | null;

  @Column({ type: 'varchar', nullable: true })
  max: string | null;
}
