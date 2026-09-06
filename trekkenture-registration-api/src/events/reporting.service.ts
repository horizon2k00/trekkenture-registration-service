import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { Submission } from '../entities/submission.entity';
import { EventsService } from './events.service';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionsRepository: Repository<Submission>,
    private readonly eventsService: EventsService,
  ) {}

  async exportEventSubmissions(eventId: string): Promise<StreamableFile> {
    const event: Event = await this.eventsService.findOne(eventId);
    const questions = event.questions;
    const submissions = await this.submissionsRepository.find({
      where: { eventId },
      order: { submittedAt: 'ASC' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Submissions');
    worksheet.addRow([
      'Submission ID',
      'Submitted At',
      ...questions.map((question) => question.question),
    ]);
    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };

    for (const submission of submissions) {
      worksheet.addRow([
        submission.id,
        submission.submittedAt.toISOString(),
        ...questions.map((question) => {
          const value = submission.answers[question.id];
          if (Array.isArray(value)) return value.join(', ');
          return typeof value === 'boolean'
            ? value
              ? 'Yes'
              : 'No'
            : (value ?? '');
        }),
      ]);
    }

    worksheet.columns.forEach((column) => {
      let width = 12;
      column.eachCell({ includeEmpty: true }, (cell) => {
        width = Math.max(width, String(cell.value ?? '').length + 2);
      });
      column.width = Math.min(width, 50);
    });

    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
    const date = new Date().toISOString().slice(0, 10);
    this.logger.log(
      `Exported ${submissions.length} submissions for form ${event.id}`,
    );
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${event.slug}-responses-${date}.xlsx"`,
    });
  }
}
