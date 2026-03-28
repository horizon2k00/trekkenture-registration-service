# 🚀 Quick Start Checklist

Follow these steps to get your Trekkenture Registration API up and running!

---

## ✅ Prerequisites

- [ ] Node.js v18+ installed
- [ ] PostgreSQL installed and running
- [ ] npm or yarn installed
- [ ] Code editor (VS Code recommended)
- [ ] Email account for SMTP (Gmail recommended)

---

## 📋 Setup Steps

### Step 1: Database Setup

- [ ] Start PostgreSQL service
- [ ] Open psql or pgAdmin
- [ ] Create database:
  ```sql
  CREATE DATABASE trekkenture;
  ```
- [ ] Verify database exists:
  ```sql
  \l  -- or SELECT datname FROM pg_database;
  ```

### Step 2: Environment Configuration

- [ ] Copy `.env.example` to `.env`:
  ```bash
  cp .env.example .env
  ```
- [ ] Update database credentials in `.env`:
  - `DB_HOST` (default: localhost)
  - `DB_PORT` (default: 5432)
  - `DB_USERNAME` (default: postgres)
  - `DB_PASSWORD` (your password)
  - `DB_NAME` (trekkenture)

- [ ] Generate strong JWT secret:

  ```bash
  # On Linux/Mac:
  openssl rand -base64 32

  # On Windows PowerShell:
  [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
  ```

  - Update `JWT_SECRET` in `.env`

- [ ] Set admin credentials in `.env`:
  - `ADMIN_USERNAME` (change from 'admin')
  - `ADMIN_PASSWORD` (change from 'admin123')

- [ ] Configure SMTP in `.env`:
  - `SMTP_HOST` (smtp.gmail.com for Gmail)
  - `SMTP_PORT` (587 for Gmail)
  - `SMTP_USER` (your-email@gmail.com)
  - `SMTP_PASS` (your Gmail App Password\*)
  - `SMTP_FROM` (display name and email)

  **For Gmail App Password:**
  1. Go to Google Account Settings
  2. Security > 2-Step Verification (enable it)
  3. App Passwords > Select app: Mail, device: Other
  4. Copy the 16-character password
  5. Paste in `SMTP_PASS`

### Step 3: Install Dependencies (Already Done ✅)

- [x] Dependencies installed via `npm install`

### Step 4: Build & Verify

- [ ] Run build to verify everything compiles:
  ```bash
  npm run build
  ```
- [ ] Should complete without errors

### Step 5: Start Development Server

- [ ] Start the application:
  ```bash
  npm run start:dev
  ```
- [ ] Wait for message: `Application is running on: http://localhost:3000`
- [ ] Check for database connection success in logs

---

## 🧪 Verify Installation

### Test 1: API is Running

- [ ] Open browser or curl:
  ```bash
  curl http://localhost:3000
  ```
- [ ] Should get response from default route

### Test 2: Login Works

- [ ] Test authentication:
  ```bash
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}'
  ```
- [ ] Should receive JWT token in response

### Test 3: Database Tables Created

- [ ] Check database:
  ```sql
  \c trekkenture
  \dt
  ```
- [ ] Should see `events` and `submissions` tables

### Test 4: Create Event (Protected Route)

- [ ] Get token from Test 2
- [ ] Create event:
  ```bash
  curl -X POST http://localhost:3000/events \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Event",
      "slug": "test-event",
      "selectedFormSections": ["personal"],
      "studentSections": ["School"],
      "advancePayment": 1000,
      "totalPayment": 5000
    }'
  ```
- [ ] Should receive event object with UUID

### Test 5: Get Event (Public Route)

- [ ] Fetch event by slug:
  ```bash
  curl http://localhost:3000/events/test-event
  ```
- [ ] Should receive event details

### Test 6: Submit Registration

- [ ] Submit form (use event ID from Test 4):
  ```bash
  curl -X POST http://localhost:3000/submissions \
    -H "Content-Type: application/json" \
    -d '{
      "eventId": "YOUR_EVENT_ID",
      "email": "test@example.com",
      "formData": {
        "name": "Test User",
        "phone": "1234567890"
      }
    }'
  ```
- [ ] Should receive success message
- [ ] Check email inbox for confirmation

### Test 7: Export to Excel

- [ ] Export submissions (use token and event ID):
  ```bash
  curl -X GET http://localhost:3000/events/YOUR_EVENT_ID/export \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -o test-export.xlsx
  ```
- [ ] Should download Excel file
- [ ] Open file and verify data

---

## 📊 Database Verification

- [ ] Connect to database:

  ```sql
  psql -U postgres -d trekkenture
  ```

- [ ] Check events:

  ```sql
  SELECT id, name, slug FROM events;
  ```

- [ ] Check submissions:

  ```sql
  SELECT id, "eventId", "formData", "submittedAt" FROM submissions;
  ```

- [ ] Verify relationship:
  ```sql
  SELECT
    s.id as submission_id,
    e.name as event_name,
    s."formData"->>'name' as participant_name,
    s."submittedAt"
  FROM submissions s
  JOIN events e ON s."eventId" = e.id;
  ```

---

## 🔧 Troubleshooting

### Issue: Port 3000 already in use

**Solution:**

```bash
# Find process
netstat -ano | findstr :3000

# Kill process (Windows)
taskkill /PID <PID> /F

# Or change port in .env
PORT=3001
```

### Issue: Database connection failed

**Solution:**

- [ ] Verify PostgreSQL is running
- [ ] Check credentials in `.env`
- [ ] Test connection:
  ```bash
  psql -U postgres -d trekkenture
  ```

### Issue: Module not found errors

**Solution:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Issue: Email not sending

**Solution:**

- [ ] Verify SMTP credentials
- [ ] For Gmail: Use App Password
- [ ] Check logs for specific error
- [ ] Test with Mailtrap for development

### Issue: Build fails

**Solution:**

```bash
# Clean build
npm run build -- --clean
```

---

## 📚 Next Steps

Once everything works:

1. **Change Default Credentials**
   - [ ] Update `ADMIN_USERNAME`
   - [ ] Update `ADMIN_PASSWORD`
   - [ ] Generate new `JWT_SECRET`

2. **Configure CORS**
   - [ ] Update `CORS_ORIGIN` in `.env` to match frontend URL

3. **Test All Endpoints**
   - [ ] Refer to `API_TESTING.md`
   - [ ] Use Postman or REST Client

4. **Review Documentation**
   - [ ] Read `README.md` for API overview
   - [ ] Check `SETUP_GUIDE.md` for detailed info
   - [ ] Review `IMPLEMENTATION_SUMMARY.md`

5. **Production Preparation**
   - [ ] Set `NODE_ENV=production`
   - [ ] Disable TypeORM `synchronize`
   - [ ] Set up database migrations
   - [ ] Configure logging
   - [ ] Set up monitoring

---

## ✨ You're All Set!

Your Trekkenture Registration API is ready for development!

**API Running At:** `http://localhost:3000`

**Available Documentation:**

- `README.md` - Project overview
- `SETUP_GUIDE.md` - Detailed setup guide
- `API_TESTING.md` - API testing reference
- `IMPLEMENTATION_SUMMARY.md` - Complete feature list

**Support:**

- Check logs in terminal for errors
- Review documentation files
- Verify `.env` configuration
- Test endpoints with curl or Postman

---

**Happy Coding! 🎉**
