import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SaveQuestionDto, SaveQuestionGroupDto } from './question.dto';
import { QuestionsService } from './questions.service';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Get('form-catalog')
  getCatalog() {
    return this.questions.getCatalog();
  }

  @Post('question-groups')
  createGroup(@Body() dto: SaveQuestionGroupDto) {
    return this.questions.createGroup(dto);
  }

  @Put('question-groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: SaveQuestionGroupDto) {
    return this.questions.updateGroup(id, dto);
  }

  @Delete('question-groups/:id')
  @HttpCode(204)
  deleteGroup(@Param('id') id: string) {
    return this.questions.deleteGroup(id);
  }

  @Post('questions')
  createQuestion(@Body() dto: SaveQuestionDto) {
    return this.questions.createQuestion(dto);
  }

  @Put('questions/:id')
  updateQuestion(@Param('id') id: string, @Body() dto: SaveQuestionDto) {
    return this.questions.updateQuestion(id, dto);
  }

  @Delete('questions/:id')
  @HttpCode(204)
  deleteQuestion(@Param('id') id: string) {
    return this.questions.deleteQuestion(id);
  }
}
