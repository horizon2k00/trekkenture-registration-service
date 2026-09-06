import { Column, Entity, PrimaryColumn } from 'typeorm';
import { GroupDefinition } from '../questions/question-types';

@Entity('question_groups')
export class QuestionGroup implements GroupDefinition {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;
}
