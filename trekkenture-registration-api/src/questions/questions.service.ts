import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { QuestionGroup } from '../entities/question-group.entity';
import { Question } from '../entities/question.entity';
import {
  GroupDefinition,
  QuestionDefinition,
  PAYMENT_GROUP_ID,
  PAYMENT_REFERENCE_ID,
} from './question-types';
import { SaveQuestionDto, SaveQuestionGroupDto } from './question.dto';
import { questionBounds } from './question-bounds';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(QuestionGroup)
    private readonly groups: Repository<QuestionGroup>,
    @InjectRepository(Question)
    private readonly questions: Repository<Question>,
  ) {}

  async getCatalog(): Promise<{
    groups: GroupDefinition[];
    questions: QuestionDefinition[];
  }> {
    const [groups, questions] = await Promise.all([
      this.groups.find({ order: { name: 'ASC' } }),
      this.questions.find({ order: { question: 'ASC' } }),
    ]);
    return { groups, questions };
  }

  createGroup(dto: SaveQuestionGroupDto) {
    return this.groups.save({ id: randomUUID(), ...dto });
  }

  async updateGroup(id: string, dto: SaveQuestionGroupDto) {
    await this.findGroup(id);
    return this.groups.save({ id, ...dto });
  }

  async deleteGroup(id: string) {
    if (id === PAYMENT_GROUP_ID) {
      throw new ConflictException(
        'Payment is a built-in group. Remove it from individual forms instead.',
      );
    }
    await this.findGroup(id);
    if (await this.questions.existsBy({ groupId: id })) {
      throw new ConflictException(
        "Move or delete this group's questions first",
      );
    }
    try {
      await this.groups.delete(id);
    } catch (error) {
      // The FK also protects against a question being added during deletion.
      if (error.code === '23503') {
        throw new ConflictException(
          "Move or delete this group's questions first",
        );
      }
      throw error;
    }
  }

  async createQuestion(dto: SaveQuestionDto) {
    return this.saveQuestion(randomUUID(), dto);
  }

  async updateQuestion(id: string, dto: SaveQuestionDto) {
    await this.findQuestion(id);
    return this.saveQuestion(id, dto);
  }

  async deleteQuestion(id: string) {
    if (id === PAYMENT_REFERENCE_ID) {
      throw new ConflictException(
        'The transaction number is a required part of Payment. Remove the Payment group from a form instead.',
      );
    }
    await this.findQuestion(id);
    await this.questions.delete(id);
  }

  private async findGroup(id: string) {
    const group = await this.groups.findOneBy({ id });
    if (!group) throw new NotFoundException('Question group not found');
    return group;
  }

  private async findQuestion(id: string) {
    const question = await this.questions.findOneBy({ id });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  private async saveQuestion(id: string, dto: SaveQuestionDto) {
    if (
      id === PAYMENT_REFERENCE_ID &&
      (dto.groupId !== PAYMENT_GROUP_ID ||
        dto.fieldType !== 'text' ||
        dto.answerType !== 'string')
    ) {
      throw new BadRequestException(
        'The transaction number must remain a text question in the Payment group.',
      );
    }
    await this.findGroup(dto.groupId);
    const options = (dto.options ?? []).map((option) => option.trim());
    if (
      options.some((option) => !option) ||
      new Set(options).size !== options.length
    ) {
      throw new BadRequestException('Options must be non-empty and unique');
    }

    const answerType = dto.fieldType === 'text' ? dto.answerType : null;
    if (dto.fieldType === 'text' && !answerType) {
      throw new BadRequestException('Text questions require an answer type');
    }
    const { min, max } = questionBounds(answerType, dto.min, dto.max);
    if (!['dropdown', 'radio'].includes(dto.fieldType) && options.length) {
      throw new BadRequestException(
        'Only dropdown and radio questions can have options',
      );
    }
    try {
      return await this.questions.save({
        id,
        groupId: dto.groupId,
        question: dto.question,
        fieldType: dto.fieldType,
        answerType,
        options,
        min,
        max,
      });
    } catch (error) {
      if (error.code === '23503') {
        throw new NotFoundException('Question group not found');
      }
      throw error;
    }
  }
}
