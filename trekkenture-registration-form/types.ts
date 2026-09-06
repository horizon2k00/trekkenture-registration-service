export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type Answer = string | number | boolean;
export type FieldType = 'text' | 'dropdown' | 'radio' | 'checkbox';
export type AnswerType = 'string' | 'number' | 'date' | 'email' | 'phone';

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

export interface FormCatalog {
  groups: GroupDefinition[];
  questions: QuestionDefinition[];
}

export interface FormSummary {
  id: string;
  name: string;
  slug: string;
  status: EventStatus;
  advancePayment: number | null;
  totalPayment: number | null;
  responseCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FormDetail extends FormSummary {
  questions: FormQuestion[];
  groups: GroupDefinition[];
}

export interface PaymentSettings {
  upiId: string;
  payeeName: string;
  currency: string;
}

export interface PaymentConfiguration extends PaymentSettings {
  advancePayment: number | null;
  totalPayment: number | null;
}

export interface PublicForm {
  id: string;
  name: string;
  slug: string;
  status: EventStatus;
  questions?: FormQuestion[];
  groups?: GroupDefinition[];
  payment?: PaymentConfiguration;
}

export interface Submission {
  id: string;
  eventId: string;
  answers: Record<string, Answer>;
  submittedAt: string;
}

export interface FormInput {
  name: string;
  slug: string;
  groupIds: string[];
  questions: {
    id: string;
    required: boolean;
    options?: string[];
    min?: string | null;
    max?: string | null;
  }[];
  advancePayment: number | null;
  totalPayment: number | null;
}
