import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { Event } from './entities/event.entity';
import { Submission } from './entities/submission.entity';
import { Question } from './entities/question.entity';
import { QuestionGroup } from './entities/question-group.entity';

// Used by both the API and the migration CLI.
export function databaseOptions(): PostgresConnectionOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Event, Submission, Question, QuestionGroup],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.PGSSLMODE === 'require',
  };
}
