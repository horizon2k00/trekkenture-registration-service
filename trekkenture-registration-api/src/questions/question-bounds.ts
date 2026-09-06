import { BadRequestException } from '@nestjs/common';
import { AnswerType } from './question-types';

export function questionBounds(
  answerType: AnswerType | null,
  minimum?: string | null,
  maximum?: string | null,
) {
  const min = minimum?.trim() || null;
  const max = maximum?.trim() || null;
  if (
    (min !== null || max !== null) &&
    answerType !== 'number' &&
    answerType !== 'date'
  ) {
    throw new BadRequestException(
      'Only number and date answers can have bounds',
    );
  }
  for (const bound of [min, max]) {
    if (bound === null) continue;
    if (answerType === 'number' && !Number.isFinite(Number(bound))) {
      throw new BadRequestException('Number bounds must be finite numbers');
    }
    if (answerType === 'date') {
      const date = new Date(`${bound}T00:00:00.000Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(bound) ||
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== bound
      ) {
        throw new BadRequestException(
          'Date bounds must be valid YYYY-MM-DD dates',
        );
      }
    }
  }
  if (
    min !== null &&
    max !== null &&
    (answerType === 'number' ? Number(min) > Number(max) : min > max)
  ) {
    throw new BadRequestException('Minimum must not exceed maximum');
  }
  // Store numeric limits in a format native number inputs also understand.
  return {
    min: answerType === 'number' && min !== null ? String(Number(min)) : min,
    max: answerType === 'number' && max !== null ? String(Number(max)) : max,
  };
}
