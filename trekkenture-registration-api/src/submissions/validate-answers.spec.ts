import { BadRequestException } from '@nestjs/common';
import { FormQuestion } from '../questions/question-types';
import { validateAnswers } from './validate-answers';

const question = (overrides: Partial<FormQuestion> = {}): FormQuestion => ({
  id: 'answer',
  groupId: 'student',
  question: 'Question',
  fieldType: 'text',
  answerType: 'string',
  options: [],
  min: null,
  max: null,
  required: true,
  ...overrides,
});

describe('validateAnswers', () => {
  it('normalizes text and boolean answers using only the saved form questions', () => {
    const questions = [
      question({ id: 'name' }),
      question({ id: 'age', answerType: 'number', min: '5', max: '25' }),
      question({ id: 'consent', fieldType: 'checkbox', answerType: null }),
    ];
    expect(
      validateAnswers(questions, {
        name: '  Student Name  ',
        age: 12,
        consent: true,
      }),
    ).toEqual({
      name: 'Student Name',
      age: 12,
      consent: true,
    });
  });

  it('rejects answer keys that are not in the saved form', () => {
    expect(() =>
      validateAnswers([question()], { answer: 'Name', extra: true }),
    ).toThrow(new BadRequestException('Unexpected answers: extra'));
  });

  it.each([undefined, null, '', '  '])(
    'skips an optional blank answer: %p',
    (value) => {
      expect(
        validateAnswers([question({ required: false })], { answer: value }),
      ).toEqual({});
    },
  );

  it.each([undefined, false])(
    'stores an optional omitted or unchecked checkbox as false: %p',
    (value) => {
      expect(
        validateAnswers(
          [
            question({
              fieldType: 'checkbox',
              answerType: null,
              required: false,
            }),
          ],
          { answer: value },
        ),
      ).toEqual({ answer: false });
    },
  );

  it.each([null, '', '  '])(
    'rejects an explicitly supplied nonboolean checkbox value: %p',
    (value) => {
      expect(() =>
        validateAnswers(
          [
            question({
              fieldType: 'checkbox',
              answerType: null,
              required: false,
            }),
          ],
          { answer: value },
        ),
      ).toThrow('must be a boolean');
    },
  );

  it('keeps valid false and zero answers', () => {
    expect(
      validateAnswers(
        [
          question({
            id: 'consent',
            fieldType: 'checkbox',
            answerType: null,
            required: false,
          }),
          question({ id: 'count', answerType: 'number' }),
        ],
        { consent: false, count: 0 },
      ),
    ).toEqual({ consent: false, count: 0 });
  });

  const invalidCases: {
    name: string;
    definition?: Partial<FormQuestion>;
    value: unknown;
    message: string;
  }[] = [
    { name: 'required whitespace', value: '  ', message: 'is required' },
    {
      name: 'required missing answer',
      value: undefined,
      message: 'is required',
    },
    {
      name: 'number supplied as text',
      definition: { answerType: 'number' },
      value: '12',
      message: 'must be a number',
    },
    {
      name: 'nonfinite number',
      definition: { answerType: 'number' },
      value: Infinity,
      message: 'must be a number',
    },
    {
      name: 'NaN',
      definition: { answerType: 'number' },
      value: NaN,
      message: 'must be a number',
    },
    {
      name: 'number below minimum',
      definition: { answerType: 'number', min: '5' },
      value: 4,
      message: 'at least 5',
    },
    {
      name: 'number above maximum',
      definition: { answerType: 'number', max: '25' },
      value: 26,
      message: 'at most 25',
    },
    {
      name: 'number supplied for text',
      value: 12,
      message: 'must be valid text',
    },
    {
      name: 'object supplied for optional text',
      definition: { required: false },
      value: {},
      message: 'must be valid text',
    },
    {
      name: 'oversized text',
      value: 'x'.repeat(5001),
      message: 'must be valid text',
    },
    {
      name: 'invalid email',
      definition: { answerType: 'email' },
      value: 'person@example',
      message: 'valid email',
    },
    {
      name: 'invalid phone',
      definition: { answerType: 'phone' },
      value: '12345',
      message: 'valid 10-digit number',
    },
    {
      name: 'impossible date',
      definition: { answerType: 'date' },
      value: '2025-02-29',
      message: 'valid date',
    },
    {
      name: 'date with timestamp',
      definition: { answerType: 'date' },
      value: '2024-02-29T00:00:00Z',
      message: 'valid date',
    },
    {
      name: 'date before minimum',
      definition: { answerType: 'date', min: '2024-01-01' },
      value: '2023-12-31',
      message: 'on or after 2024-01-01',
    },
    {
      name: 'date after maximum',
      definition: { answerType: 'date', max: '2024-12-31' },
      value: '2025-01-01',
      message: 'on or before 2024-12-31',
    },
    {
      name: 'unknown dropdown option',
      definition: { fieldType: 'dropdown', options: ['A', 'B'] },
      value: 'C',
      message: 'invalid selection',
    },
    {
      name: 'array supplied for radio',
      definition: { fieldType: 'radio', options: ['A', 'B'] },
      value: ['A'],
      message: 'invalid selection',
    },
    {
      name: 'required unchecked consent',
      definition: { fieldType: 'checkbox' },
      value: false,
      message: 'is required',
    },
    {
      name: 'string supplied for consent',
      definition: { fieldType: 'checkbox' },
      value: 'true',
      message: 'must be a boolean',
    },
    {
      name: 'empty array supplied for checkbox',
      definition: { fieldType: 'checkbox' },
      value: [],
      message: 'must be a boolean',
    },
    {
      name: 'string false supplied for optional checkbox',
      definition: { fieldType: 'checkbox', required: false },
      value: 'false',
      message: 'must be a boolean',
    },
    {
      name: 'array supplied for checkbox with legacy options',
      definition: { fieldType: 'checkbox', options: ['A', 'B'] },
      value: ['A'],
      message: 'must be a boolean',
    },
    {
      name: 'number supplied for checkbox',
      definition: { fieldType: 'checkbox' },
      value: 1,
      message: 'must be a boolean',
    },
    {
      name: 'missing required checkbox',
      definition: { fieldType: 'checkbox' },
      value: undefined,
      message: 'is required',
    },
  ];

  it.each(invalidCases)('rejects $name', ({ definition, value, message }) => {
    expect(() =>
      validateAnswers([question(definition)], { answer: value }),
    ).toThrow(message);
  });

  const validCases: {
    name: string;
    definition: Partial<FormQuestion>;
    value: unknown;
    expected: unknown;
  }[] = [
    {
      name: 'numeric lower boundary',
      definition: { answerType: 'number', min: '5', max: '25' },
      value: 5,
      expected: 5,
    },
    {
      name: 'numeric upper boundary',
      definition: { answerType: 'number', min: '5', max: '25' },
      value: 25,
      expected: 25,
    },
    {
      name: 'leap date at both boundaries',
      definition: { answerType: 'date', min: '2024-02-29', max: '2024-02-29' },
      value: '2024-02-29',
      expected: '2024-02-29',
    },
    {
      name: 'email',
      definition: { answerType: 'email' },
      value: ' person@example.com ',
      expected: 'person@example.com',
    },
    {
      name: 'formatted phone',
      definition: { answerType: 'phone' },
      value: '98765-43210',
      expected: '98765-43210',
    },
    {
      name: 'dropdown choice',
      definition: { fieldType: 'dropdown', options: ['A', 'B'] },
      value: 'B',
      expected: 'B',
    },
    {
      name: 'radio choice',
      definition: { fieldType: 'radio', options: ['A', 'B'] },
      value: 'A',
      expected: 'A',
    },
    {
      name: 'optional unchecked checkbox',
      definition: {
        fieldType: 'checkbox',
        required: false,
      },
      value: false,
      expected: false,
    },
    {
      name: 'checked checkbox',
      definition: { fieldType: 'checkbox' },
      value: true,
      expected: true,
    },
  ];

  it.each(validCases)('accepts $name', ({ definition, value, expected }) => {
    expect(validateAnswers([question(definition)], { answer: value })).toEqual({
      answer: expected,
    });
  });
});
