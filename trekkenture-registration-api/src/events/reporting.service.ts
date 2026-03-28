import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { Submission } from '../entities/submission.entity';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
  ) {}

  async exportEventSubmissions(eventId: string): Promise<StreamableFile> {
    // Verify event exists
    const event = await this.eventsRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID '${eventId}' not found`);
    }

    // Get all submissions for this event
    const submissions = await this.submissionsRepository.find({
      where: { eventId },
      order: { submittedAt: 'ASC' },
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Submissions');

    // Extract all unique field names from formData
    const allFields = new Set<string>();
    submissions.forEach((submission) => {
      Object.keys(submission.formData).forEach((key) => allFields.add(key));
    });

    // Create headers
    const headers = ['Submission ID', 'Submitted At', ...Array.from(allFields)];

    worksheet.addRow(headers);

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    submissions.forEach((submission) => {
      const row = [
        submission.id,
        submission.submittedAt.toISOString(),
        ...Array.from(allFields).map((field) => {
          const value = submission.formData[field];
          return typeof value === 'object' ? JSON.stringify(value) : value;
        }),
      ];
      worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(maxLength + 2, 50); // Max width of 50
    });

    // Generate buffer
    const buffer = (await workbook.xlsx.writeBuffer()) as any;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="event-${event.slug}-submissions-${new Date().toISOString().split('T')[0]}.xlsx"`,
    });
  }
}
