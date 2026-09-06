import { BadRequestException } from '@nestjs/common';
import { Answer, FormQuestion } from '../questions/question-types';

/** Validate against the form's saved questions, even if the library has changed. */
export function validateAnswers(
  questions: FormQuestion[],
  answers: Record<string, unknown>,
): Record<string, Answer> {
  const allowedIds = new Set(questions.map((question) => question.id));
  const unknownIds = Object.keys(answers).filter((id) => !allowedIds.has(id));
  if (unknownIds.length) {
    throw new BadRequestException(
      `Unexpected answers: ${unknownIds.join(', ')}`,
    );
  }

  const normalized: Record<string, Answer> = {};
  for (const question of questions) {
    const value = answers[question.id];
    if (question.fieldType === 'checkbox') {
      if (question.required && (value === undefined || value === false)) {
        throw new BadRequestException(`${question.question} is required`);
      }
      if (value !== undefined && typeof value !== 'boolean') {
        throw new BadRequestException(`${question.question} must be a boolean`);
      }
      normalized[question.id] = value === true;
      continue;
    }

    const blank = value == null || (typeof value === 'string' && !value.trim());
    if (blank) {
      if (question.required) {
        throw new BadRequestException(`${question.question} is required`);
      }
      continue;
    }

    if (question.fieldType === 'dropdown' || question.fieldType === 'radio') {
      if (typeof value !== 'string' || !question.options.includes(value)) {
        throw new BadRequestException(
          `${question.question} has an invalid selection`,
        );
      }
      normalized[question.id] = value;
      continue;
    }

    if (question.answerType === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new BadRequestException(`${question.question} must be a number`);
      }
      if (question.min !== null && value < Number(question.min)) {
        throw new BadRequestException(
          `${question.question} must be at least ${question.min}`,
        );
      }
      if (question.max !== null && value > Number(question.max)) {
        throw new BadRequestException(
          `${question.question} must be at most ${question.max}`,
        );
      }
      normalized[question.id] = value;
      continue;
    }

    if (typeof value !== 'string' || value.length > 5000) {
      throw new BadRequestException(`${question.question} must be valid text`);
    }
    const text = value.trim();
    if (
      question.answerType === 'email' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
    ) {
      throw new BadRequestException(
        `${question.question} must be a valid email`,
      );
    }
    if (
      question.answerType === 'phone' &&
      !/^\d{10}$/.test(text.replace(/\D/g, ''))
    ) {
      throw new BadRequestException(
        `${question.question} must be a valid 10-digit number`,
      );
    }
    if (question.answerType === 'date') {
      const date = new Date(`${text}T00:00:00.000Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(text) ||
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== text
      ) {
        throw new BadRequestException(
          `${question.question} must be a valid date`,
        );
      }
      if (question.min !== null && text < question.min) {
        throw new BadRequestException(
          `${question.question} must be on or after ${question.min}`,
        );
      }
      if (question.max !== null && text > question.max) {
        throw new BadRequestException(
          `${question.question} must be on or before ${question.max}`,
        );
      }
    }
    normalized[question.id] = text;
  }
  return normalized;
}
