import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { Event } from './entities/event.entity';
import { Submission } from './entities/submission.entity';
import { Question } from './entities/question.entity';
import { QuestionGroup } from './entities/question-group.entity';

// Used by both the API and the migration CLI.
//
// Prefer individual DB_* parameters (DB_HOST, DB_PORT, DB_USERNAME,
// DB_PASSWORD, DB_NAME, PGSSLMODE). DATABASE_URL is accepted as a fallback
// so a single Neon connection string works without manual splitting.
export function databaseOptions(): PostgresConnectionOptions {
  const entities = [Event, Submission, Question, QuestionGroup];
  const migrations = [__dirname + '/migrations/*{.ts,.js}'];
  const synchronize = false;
  const logging = process.env.DB_LOGGING === 'true';

  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const sslRequired =
      process.env.PGSSLMODE === 'require' || url.includes('sslmode=require');
    return {
      type: 'postgres',
      url,
      entities,
      migrations,
      synchronize,
      logging,
      ssl: sslRequired ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities,
    migrations,
    synchronize,
    logging,
    ssl:
      process.env.PGSSLMODE === 'require'
        ? { rejectUnauthorized: false }
        : false,
  };
}
