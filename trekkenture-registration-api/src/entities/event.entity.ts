import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Submission } from './submission.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'jsonb', nullable: true })
  selectedFormSections: any[];

  @Column({ type: 'simple-json', nullable: true })
  studentSections: any[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  advancePayment: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPayment: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Submission, (submission) => submission.event)
  submissions: Submission[];
}
