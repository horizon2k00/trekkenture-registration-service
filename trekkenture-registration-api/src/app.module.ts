import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { EmailModule } from './email/email.module';
import { Event } from './entities/event.entity';
import { Submission } from './entities/submission.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'trekkenture'),
        entities: [Event, Submission],
        synchronize: configService.get<string>('NODE_ENV') !== 'production', // Auto-sync in dev only
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    EventsModule,
    SubmissionsModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
