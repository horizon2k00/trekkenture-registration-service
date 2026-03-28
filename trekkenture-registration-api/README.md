# Trekkenture Registration API

A production-ready NestJS API for event registration management with dynamic forms, submissions, email notifications, and Excel reporting.

## Features

- **Event Management**: Full CRUD operations for events with dynamic form sections
- **Submission Handling**: Public submission endpoint with automatic email confirmation
- **Authentication**: JWT-based authentication with Passport for admin routes
- **Email Notifications**: Template-based email system using Handlebars
- **Excel Reporting**: Export event submissions to Excel with protected endpoints
- **Database**: TypeORM with PostgreSQL support

## Tech Stack

- **Framework**: NestJS 10
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT + Passport
- **Email**: @nestjs-modules/mailer with Nodemailer
- **Excel**: ExcelJS
- **Validation**: class-validator & class-transformer

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your configuration
```

## Configuration

Update the `.env` file with your settings:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_NAME=trekkenture

# JWT
JWT_SECRET=your-strong-secret-key

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password

# SMTP (for Gmail, enable 2FA and use App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Database Setup

```bash
# Make sure PostgreSQL is running
# Create database
psql -U postgres
CREATE DATABASE trekkenture;
\q

# The application will auto-sync tables in development mode
```

## Running the Application

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

## API Endpoints

### Authentication

- **POST** `/auth/login` - Admin login
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```

### Events (Public: GET, Protected: POST/PATCH/DELETE)

- **GET** `/events` - Get all events
- **GET** `/events/:slug` - Get event by slug (public - for form display)
- **POST** `/events` - Create event (requires JWT)
- **PATCH** `/events/:id` - Update event (requires JWT)
- **DELETE** `/events/:id` - Delete event (requires JWT)
- **GET** `/events/:id/export` - Export submissions to Excel (requires JWT)

#### Create Event Example:

```json
{
  "name": "Mountain Trek 2025",
  "slug": "mountain-trek-2025",
  "selectedFormSections": ["personal", "emergency", "medical"],
  "studentSections": ["School Name", "Grade"],
  "advancePayment": 5000.0,
  "totalPayment": 15000.0
}
```

### Submissions (Public)

- **POST** `/submissions` - Submit registration form
  ```json
  {
    "eventId": "uuid-of-event",
    "email": "user@example.com",
    "formData": {
      "name": "John Doe",
      "phone": "1234567890",
      "age": 25,
      "emergencyContact": "Jane Doe"
    }
  }
  ```

## Project Structure

```
src/
├── auth/                   # Authentication module
│   ├── auth.controller.ts  # Login endpoint
│   ├── auth.service.ts     # Auth logic
│   ├── jwt.strategy.ts     # JWT strategy
│   └── jwt-auth.guard.ts   # Auth guard
├── dto/                    # Data Transfer Objects
│   ├── event.dto.ts        # Event DTOs with validation
│   ├── submission.dto.ts   # Submission DTO
│   └── login.dto.ts        # Login DTO
├── email/                  # Email module
│   ├── email.service.ts    # Email sending logic
│   └── email.module.ts     # Mailer configuration
├── entities/               # TypeORM entities
│   ├── event.entity.ts     # Event entity
│   └── submission.entity.ts # Submission entity
├── events/                 # Events module
│   ├── events.controller.ts # Events CRUD + export
│   ├── events.service.ts    # Events business logic
│   ├── reporting.service.ts # Excel export logic
│   └── events.module.ts
├── submissions/            # Submissions module
│   ├── submissions.controller.ts
│   ├── submissions.service.ts
│   └── submissions.module.ts
├── app.module.ts          # Root module with TypeORM config
└── main.ts                # Application entry point

templates/
└── thank-you.hbs          # Email template
```

## Security Notes

1. **Environment Variables**: Never commit `.env` file
2. **JWT Secret**: Use a strong random string in production
3. **Database**: Use strong credentials
4. **SMTP**: Use app-specific passwords, not your main password
5. **CORS**: Configure specific origins in production

## Development Tips

### Testing Authentication

```bash
# Login to get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Use token in protected routes
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Event",...}'
```

### Email Testing

For development, you can use:

- **Gmail**: Enable 2FA and create an App Password
- **Mailtrap**: Free testing service
- **SendGrid**: Production email service

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Disable TypeORM `synchronize` (set to `false`)
3. Use migrations for database changes
4. Configure proper CORS origins
5. Use environment-specific configs
6. Enable HTTPS
7. Set up proper logging

## License

UNLICENSED

    <p align="center">

<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
<a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
<a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
<a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>

</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
