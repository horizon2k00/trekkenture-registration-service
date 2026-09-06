import { BadRequestException } from '@nestjs/common';
import { SaveFormDto } from '../dto/event.dto';
import { Event } from '../entities/event.entity';
import { questionBounds } from '../questions/question-bounds';
import {
  FormQuestion,
  GroupDefinition,
  QuestionDefinition,
  PAYMENT_GROUP_ID,
  PAYMENT_REFERENCE_ID,
} from '../questions/question-types';

export function buildFormDefinition(
  dto: SaveFormDto,
  catalog: { groups: GroupDefinition[]; questions: QuestionDefinition[] },
  existing?: Event,
) {
  const questions: FormQuestion[] = dto.questions.map((selection) => {
    // Existing forms own their copies, even if a library item was edited/deleted.
    const question =
      existing?.questions.find((item) => item.id === selection.id) ??
      catalog.questions.find((item) => item.id === selection.id);
    if (!question)
      throw new BadRequestException(`Unknown question: ${selection.id}`);
    const hasOptions = ['dropdown', 'radio'].includes(question.fieldType);
    const options = (
      selection.options ?? (hasOptions ? question.options : [])
    ).map((option) => option.trim());
    if (
      options.some((option) => !option) ||
      new Set(options).size !== options.length
    ) {
      throw new BadRequestException('Options must be nonempty and unique');
    }
    if (!hasOptions && options.length) {
      throw new BadRequestException(
        'Only dropdown and radio questions can have options',
      );
    }
    // Omitted limits keep the saved/default value; null explicitly clears it.
    const bounds = questionBounds(
      question.fieldType === 'text' ? question.answerType : null,
      selection.min === undefined ? question.min : selection.min,
      selection.max === undefined ? question.max : selection.max,
    );
    return { ...question, required: selection.required, options, ...bounds };
  });
  // Older clients imply groups from their questions. The builder sends their order.
  const groupIds = dto.groupIds ?? [
    ...new Set(questions.map((question) => question.groupId)),
  ];
  if (questions.some((question) => !groupIds.includes(question.groupId))) {
    throw new BadRequestException(
      'Every selected question must belong to a selected group',
    );
  }
  const groups = groupIds.map(
    (id) =>
      existing?.groups.find((group) => group.id === id) ??
      catalog.groups.find((group) => group.id === id),
  );
  if (groups.some((group) => !group)) {
    throw new BadRequestException('Unknown selected group');
  }

  const advancePayment = dto.advancePayment ?? null;
  const totalPayment = dto.totalPayment ?? null;
  validatePaymentGroup({ groups, questions, advancePayment, totalPayment });
  if (
    advancePayment !== null &&
    totalPayment !== null &&
    advancePayment > totalPayment
  ) {
    throw new BadRequestException(
      'Advance payment cannot exceed total payment',
    );
  }
  return {
    name: dto.name.trim(),
    slug: dto.slug,
    // Match the grouped public layout in response tables and Excel as well.
    questions: groupIds.flatMap((id) =>
      questions.filter((question) => question.groupId === id),
    ),
    groups,
    advancePayment,
    totalPayment,
  };
}

export function validateForPublishing(form: Event) {
  if (!form.questions.length)
    throw new BadRequestException(
      'Select at least one question before publishing',
    );
  for (const group of form.groups) {
    if (!form.questions.some((question) => question.groupId === group.id)) {
      throw new BadRequestException(
        `Select a question in ${group.name} or remove the group before publishing`,
      );
    }
  }
  for (const question of form.questions) {
    if (
      ['dropdown', 'radio'].includes(question.fieldType) &&
      !question.options.length
    ) {
      throw new BadRequestException(
        `Add options for ${question.question} before publishing`,
      );
    }
  }
  if (
    validatePaymentGroup(form) &&
    (form.advancePayment === null || form.totalPayment === null)
  ) {
    throw new BadRequestException(
      'Provide both payment amounts before publishing',
    );
  }
}

function validatePaymentGroup(
  form: Pick<Event, 'groups' | 'questions' | 'advancePayment' | 'totalPayment'>,
) {
  const questions = form.questions.filter(
    (question) => question.groupId === PAYMENT_GROUP_ID,
  );
  if (!form.groups.some((group) => group.id === PAYMENT_GROUP_ID)) {
    if (form.advancePayment !== null || form.totalPayment !== null) {
      throw new BadRequestException(
        'Select the Payment group before setting payment amounts.',
      );
    }
    return false;
  }
  const reference = questions.find(
    (question) => question.id === PAYMENT_REFERENCE_ID,
  );
  if (
    !reference?.required ||
    reference.fieldType !== 'text' ||
    reference.answerType !== 'string'
  ) {
    throw new BadRequestException(
      'The Payment group must include the required transaction number question.',
    );
  }
  return true;
}
