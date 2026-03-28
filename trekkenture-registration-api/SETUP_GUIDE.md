# Trekkenture Registration API - Setup & Usage Guide

## Quick Start Guide

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn
- SMTP credentials (Gmail recommended for testing)

### Step 1: Install Dependencies

All required packages have been installed:

```bash
npm install
```

**Installed Packages:**

- `@nestjs/typeorm` & `typeorm` - Database ORM
- `pg` - PostgreSQL driver
- `@nestjs/jwt` & `@nestjs/passport` - Authentication
- `passport` & `passport-jwt` - JWT strategy
- `exceljs` - Excel file generation
- `@nestjs-modules/mailer` & `nodemailer` - Email service
- `class-validator` & `class-transformer` - Validation
- `@nestjs/config` - Environment configuration

### Step 2: Database Setup

**Create PostgreSQL Database:**

```bash
# Using psql command line
psql -U postgres

# In psql:
CREATE DATABASE trekkenture;
\q
```

**Or using pgAdmin:**

1. Right-click on Databases
2. Create > Database
3. Name: `trekkenture`

### Step 3: Configure Environment Variables

**Create `.env` file:**

```bash
cp .env.example .env
```

**Update `.env` with your settings:**

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=trekkenture

# JWT Configuration (generate a strong secret)
JWT_SECRET=super-secret-change-this-to-random-string
JWT_EXPIRES_IN=24h

# Admin Credentials (change in production)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=SecurePassword123!

# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM="Trekkenture Team" <noreply@trekkenture.com>

# Application Configuration
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3001
```

**Gmail SMTP Setup:**

1. Go to Google Account Settings
2. Security > 2-Step Verification (enable it)
3. App Passwords > Select app: Mail, Select device: Other
4. Generate password and use it as `SMTP_PASS`

### Step 4: Start the Application

```bash
# Development mode with auto-reload
npm run start:dev
```

The API will start on `http://localhost:3000`

---

## API Testing Guide

### 1. Login (Get JWT Token)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "SecurePassword123!"
  }'
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save this token for protected endpoints!**

### 2. Create an Event (Protected)

```bash
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Himalayan Trek 2025",
    "slug": "himalayan-trek-2025",
    "selectedFormSections": ["personal", "emergency", "medical"],
    "studentSections": ["School Name", "Grade", "Class"],
    "advancePayment": 5000.00,
    "totalPayment": 15000.00
  }'
```

### 3. Get Event by Slug (Public)

```bash
curl http://localhost:3000/events/himalayan-trek-2025
```

This endpoint is public so forms can fetch event details.

### 4. Submit Registration (Public)

```bash
curl -X POST http://localhost:3000/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_UUID_FROM_STEP_2",
    "email": "participant@example.com",
    "formData": {
      "name": "John Doe",
      "phone": "9876543210",
      "age": 25,
      "address": "123 Main St",
      "emergencyContact": "Jane Doe",
      "emergencyPhone": "9876543211"
    }
  }'
```

**Response:**

```json
{
  "message": "Submission received successfully",
  "submissionId": "uuid-of-submission"
}
```

An email will be sent to the participant automatically.

### 5. Export Submissions to Excel (Protected)

```bash
curl -X GET http://localhost:3000/events/EVENT_UUID/export \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -o submissions.xlsx
```

This downloads an Excel file with all submissions for that event.

---

## Database Schema

### Event Entity

```typescript
{
  id: UUID (Primary Key)
  name: string
  slug: string (Unique)
  selectedFormSections: JSONB (array of strings/numbers)
  studentSections: Simple JSON (array of strings)
  advancePayment: Decimal(10,2)
  totalPayment: Decimal(10,2)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Submission Entity

```typescript
{
  id: UUID (Primary Key)
  eventId: UUID (Foreign Key -> Event)
  formData: JSONB (all form fields)
  submittedAt: Timestamp
}
```

---

## Project Structure Breakdown

```
src/
├── auth/                          # Authentication Module
│   ├── auth.controller.ts         # POST /auth/login
│   ├── auth.service.ts            # Login logic & user validation
│   ├── jwt.strategy.ts            # Passport JWT strategy
│   ├── jwt-auth.guard.ts          # Guard for protected routes
│   └── auth.module.ts             # Module configuration
│
├── dto/                           # Data Transfer Objects
│   ├── event.dto.ts               # CreateEventDto, UpdateEventDto
│   ├── submission.dto.ts          # CreateSubmissionDto
│   └── login.dto.ts               # LoginDto
│
├── email/                         # Email Module
│   ├── email.service.ts           # Send emails using Handlebars
│   └── email.module.ts            # Mailer configuration
│
├── entities/                      # TypeORM Database Entities
│   ├── event.entity.ts            # Event table definition
│   └── submission.entity.ts       # Submission table definition
│
├── events/                        # Events Module
│   ├── events.controller.ts       # CRUD endpoints + export
│   ├── events.service.ts          # Business logic (Repository pattern)
│   ├── reporting.service.ts       # Excel export with ExcelJS
│   └── events.module.ts           # Module configuration
│
├── submissions/                   # Submissions Module
│   ├── submissions.controller.ts  # POST /submissions
│   ├── submissions.service.ts     # Save submission logic
│   └── submissions.module.ts      # Module configuration
│
├── app.module.ts                  # Root module (TypeORM, all modules)
└── main.ts                        # Bootstrap (CORS, Validation)

templates/
└── thank-you.hbs                  # Email template (Handlebars)
```

---

## Authentication Flow

1. **Admin Login**: POST `/auth/login` with username/password
2. **Receive JWT**: Server returns `access_token`
3. **Use Token**: Include in header: `Authorization: Bearer <token>`
4. **Protected Routes**:
   - POST `/events` (Create)
   - PATCH `/events/:id` (Update)
   - DELETE `/events/:id` (Delete)
   - GET `/events/:id/export` (Export)

5. **Public Routes**:
   - GET `/events` (List all)
   - GET `/events/:slug` (Get by slug)
   - POST `/submissions` (Submit form)

---

## Email Template Customization

Edit `templates/thank-you.hbs`:

```handlebars
<html>
  <body>
    <h1>Thank You for Registering!</h1>
    <p>Dear {{name}},</p>
    <p>Your registration has been received.</p>
    <p>Event: {{eventName}}</p>
    <!-- Add more customization -->
  </body>
</html>
```

Pass context from `EmailService.sendThankYouEmail()`:

```typescript
context: {
  name: userName,
  eventName: event.name,
  // Add more variables
}
```

---

## Validation Rules

### Event DTO

- `name`: Required, non-empty string
- `slug`: Required, URL-friendly (lowercase, numbers, hyphens)
- `selectedFormSections`: Optional array
- `studentSections`: Optional string array
- `advancePayment`: Required number >= 0
- `totalPayment`: Required number >= 0

### Submission DTO

- `eventId`: Required UUID
- `email`: Required valid email
- `formData`: Required object (any structure)

---

## Common Issues & Solutions

### Issue: Database Connection Error

**Solution:**

- Ensure PostgreSQL is running
- Check DB credentials in `.env`
- Verify database exists: `SELECT datname FROM pg_database;`

### Issue: Email Not Sending

**Solution:**

- Check SMTP credentials
- For Gmail: Enable 2FA and use App Password
- Check firewall/network settings
- Test with Mailtrap for development

### Issue: JWT Token Invalid

**Solution:**

- Token might be expired (24h default)
- Login again to get a new token
- Ensure `JWT_SECRET` matches between requests

### Issue: CORS Error

**Solution:**

- Add your frontend URL to `CORS_ORIGIN` in `.env`
- For multiple origins, update `main.ts`:
  ```typescript
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  });
  ```

---

## Production Checklist

- [ ] Change `ADMIN_USERNAME` and `ADMIN_PASSWORD`
- [ ] Generate strong random `JWT_SECRET`
- [ ] Use production SMTP credentials
- [ ] Set `NODE_ENV=production`
- [ ] Set TypeORM `synchronize: false`
- [ ] Create database migrations
- [ ] Configure specific `CORS_ORIGIN` (not `*`)
- [ ] Set up HTTPS
- [ ] Configure logging (e.g., Winston)
- [ ] Set up monitoring (e.g., PM2, New Relic)
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

---

## Testing Endpoints with Postman

Import this collection to Postman:

**Variables:**

- `baseUrl`: `http://localhost:3000`
- `token`: (will be set after login)

**Collection:**

1. **Login** → Saves token automatically
2. **Create Event** → Uses token
3. **Get All Events** → Public
4. **Get Event by Slug** → Public
5. **Submit Registration** → Public
6. **Export Submissions** → Uses token

---

## Next Steps

1. **Add User Management**: Create a proper User entity instead of hardcoded admin
2. **Add Role-Based Access**: Admin, Moderator, etc.
3. **Add Pagination**: For events and submissions lists
4. **Add Filters**: Filter submissions by date, status, etc.
5. **Add Payment Integration**: Razorpay, Stripe, etc.
6. **Add SMS Notifications**: Using Twilio or similar
7. **Add File Uploads**: For documents, photos
8. **Add Analytics**: Dashboard for admin

---

## Support

For issues, refer to:

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Passport JWT Documentation](http://www.passportjs.org/packages/passport-jwt/)

---

**Created by:** Senior NestJS & Backend Architect  
**Last Updated:** January 19, 2026
