# API Testing Quick Reference

## Prerequisites

- Server running on `http://localhost:3000`
- PostgreSQL database created
- `.env` configured

---

## 1. Login (Get JWT Token)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoiYWRtaW4taWQiLCJpYXQiOjE3MDU2NzI4MDAsImV4cCI6MTcwNTc1OTIwMH0.xxxxxxxxxxxxx"
}
```

**💡 Save the token! You'll need it for protected endpoints.**

---

## 2. Create Event (Protected - Requires Token)

```bash
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Himalayan Trek 2026",
    "slug": "himalayan-trek-2026",
    "selectedFormSections": ["personal", "emergency", "medical", "preferences"],
    "studentSections": ["School Name", "Grade", "Class", "Division"],
    "advancePayment": 5000.00,
    "totalPayment": 15000.00
  }'
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Himalayan Trek 2026",
  "slug": "himalayan-trek-2026",
  "selectedFormSections": ["personal", "emergency", "medical", "preferences"],
  "studentSections": ["School Name", "Grade", "Class", "Division"],
  "advancePayment": "5000.00",
  "totalPayment": "15000.00",
  "createdAt": "2026-01-19T12:00:00.000Z",
  "updatedAt": "2026-01-19T12:00:00.000Z"
}
```

**💾 Save the `id` - you'll need it for export!**

---

## 3. Get All Events (Public)

```bash
curl http://localhost:3000/events
```

**Response:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Himalayan Trek 2026",
    "slug": "himalayan-trek-2026",
    ...
  }
]
```

---

## 4. Get Event by Slug (Public - For Form Display)

```bash
curl http://localhost:3000/events/himalayan-trek-2026
```

**Use Case:** Your frontend form fetches event details using this endpoint.

---

## 5. Submit Registration (Public)

```bash
curl -X POST http://localhost:3000/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "formData": {
      "fullName": "John Doe",
      "phone": "9876543210",
      "age": 25,
      "address": "123 Main Street, Mumbai",
      "emergencyContactName": "Jane Doe",
      "emergencyContactPhone": "9876543211",
      "medicalConditions": "None",
      "dietaryPreferences": "Vegetarian",
      "schoolName": "ABC School",
      "grade": "12",
      "class": "A",
      "division": "Science"
    }
  }'
```

**Response:**

```json
{
  "message": "Submission received successfully",
  "submissionId": "660e8400-e29b-41d4-a716-446655440000"
}
```

**📧 Email sent to:** `john.doe@example.com`

---

## 6. Update Event (Protected)

```bash
curl -X PATCH http://localhost:3000/events/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "advancePayment": 6000.00
  }'
```

---

## 7. Export Submissions to Excel (Protected)

```bash
curl -X GET http://localhost:3000/events/550e8400-e29b-41d4-a716-446655440000/export \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -o submissions.xlsx
```

**Downloads:** `submissions.xlsx` with all form submissions

---

## 8. Delete Event (Protected)

```bash
curl -X DELETE http://localhost:3000/events/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:** `204 No Content`

---

## Postman Collection Variables

If using Postman, set these variables:

- `baseUrl`: `http://localhost:3000`
- `token`: (set after login)
- `eventId`: (set after creating event)

Then use:

- `{{baseUrl}}/events`
- `Authorization: Bearer {{token}}`

---

## Testing Validation Errors

### Invalid Email

```bash
curl -X POST http://localhost:3000/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "invalid-email",
    "formData": {}
  }'
```

**Response:** `400 Bad Request` - email must be a valid email

### Missing Required Field

```bash
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event"
  }'
```

**Response:** `400 Bad Request` - slug should not be empty

### Invalid Slug Format

```bash
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event",
    "slug": "Test Event With Spaces",
    "advancePayment": 1000,
    "totalPayment": 5000
  }'
```

**Response:** `400 Bad Request` - Slug must be URL-friendly

---

## Testing Error Responses

### Event Not Found

```bash
curl http://localhost:3000/events/non-existent-slug
```

**Response:** `404 Not Found`

### Unauthorized (No Token)

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
```

**Response:** `401 Unauthorized`

### Invalid Token

```bash
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer invalid.token.here" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
```

**Response:** `401 Unauthorized`

### Duplicate Slug

```bash
# Create same event twice
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event",
    "slug": "test-event",
    "advancePayment": 1000,
    "totalPayment": 5000
  }'
```

**Response:** `409 Conflict` - Event with slug 'test-event' already exists

---

## PowerShell Commands (Windows)

If using PowerShell, use `Invoke-RestMethod`:

### Login

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"admin123"}'

$token = $response.access_token
Write-Host "Token: $token"
```

### Create Event

```powershell
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

$body = @{
  name = "Himalayan Trek 2026"
  slug = "himalayan-trek-2026"
  selectedFormSections = @("personal", "emergency")
  studentSections = @("School", "Grade")
  advancePayment = 5000
  totalPayment = 15000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/events" `
  -Method Post `
  -Headers $headers `
  -Body $body
```

---

## VS Code REST Client Extension

Create a file `api-tests.http`:

```http
### Variables
@baseUrl = http://localhost:3000
@token = YOUR_TOKEN_HERE
@eventId = YOUR_EVENT_ID_HERE

### Login
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

### Create Event
POST {{baseUrl}}/events
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "Himalayan Trek 2026",
  "slug": "himalayan-trek-2026",
  "selectedFormSections": ["personal", "emergency"],
  "studentSections": ["School", "Grade"],
  "advancePayment": 5000,
  "totalPayment": 15000
}

### Get All Events
GET {{baseUrl}}/events

### Submit Registration
POST {{baseUrl}}/submissions
Content-Type: application/json

{
  "eventId": "{{eventId}}",
  "email": "test@example.com",
  "formData": {
    "name": "John Doe",
    "phone": "9876543210"
  }
}

### Export Submissions
GET {{baseUrl}}/events/{{eventId}}/export
Authorization: Bearer {{token}}
```

---

## Expected Database Tables

After running the app, check your database:

```sql
-- List tables
\dt

-- Should show:
-- events
-- submissions

-- View event data
SELECT * FROM events;

-- View submissions
SELECT * FROM submissions;

-- View submission with event details
SELECT s.id, s."submittedAt", s."formData", e.name as event_name
FROM submissions s
JOIN events e ON s."eventId" = e.id;
```

---

## Common Issues

### Port Already in Use

```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

### Database Connection Error

```bash
# Test PostgreSQL connection
psql -U postgres -d trekkenture

# If fails, check:
# 1. PostgreSQL is running
# 2. Credentials in .env are correct
# 3. Database exists
```

### Email Not Sending

- Check SMTP credentials in `.env`
- For Gmail: Use App Password, not regular password
- Check console logs for error messages

---

**Happy Testing! 🚀**
