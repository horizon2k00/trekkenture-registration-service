export type FieldType = 'text' | 'dropdown' | 'radio' | 'checkbox';
export type AnswerType = 'string' | 'number' | 'date' | 'email' | 'phone';
export type Answer = string | number | boolean;

export const PAYMENT_GROUP_ID = 'payment';
export const PAYMENT_REFERENCE_ID = 'payment.utr';

export interface GroupDefinition {
  id: string;
  name: string;
  description: string;
}

export interface QuestionDefinition {
  id: string;
  groupId: string;
  question: string;
  fieldType: FieldType;
  answerType: AnswerType | null;
  options: string[];
  min: string | null;
  max: string | null;
}

export interface FormQuestion extends QuestionDefinition {
  required: boolean;
}
